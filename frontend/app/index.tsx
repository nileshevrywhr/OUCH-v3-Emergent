import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, FlatList, KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import DateTimePicker from '@react-native-community/datetimepicker';

// Types
interface Transaction {
  id: string;
  amount: number;
  category_id: string;
  category_name: string;
  transaction_type: 'income' | 'expense';
  description?: string;
  currency: string;
  transaction_date: string;
  created_at: string;
  is_voice_input: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_custom: boolean;
  created_at: string;
}

interface AppSettings {
  default_currency: 'INR' | 'USD';
  dark_mode: boolean;
  voice_enabled: boolean;
  sync_enabled: boolean;
}

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Index() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    default_currency: 'INR',
    dark_mode: false,
    voice_enabled: true,
    sync_enabled: false,
  });
  const [loading, setLoading] = useState(true);

  // Transaction form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load settings from local storage
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Load categories and transactions
      await refreshData();
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load app data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      // Fetch categories
      const categoriesResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories`);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
        await AsyncStorage.setItem('categories', JSON.stringify(categoriesData));
      }

      // Fetch recent transactions
      const transactionsResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/transactions?limit=100`);
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
        await AsyncStorage.setItem('transactions', JSON.stringify(transactionsData));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Load from local storage as fallback
      try {
        const localCategories = await AsyncStorage.getItem('categories');
        const localTransactions = await AsyncStorage.getItem('transactions');
        
        if (localCategories) setCategories(JSON.parse(localCategories));
        if (localTransactions) setTransactions(JSON.parse(localTransactions));
      } catch (localError) {
        console.error('Error loading local data:', localError);
      }
    }
  };

  const handleVoiceInput = async () => {
    if (!settings.voice_enabled) {
      Alert.alert('Voice Input Disabled', 'Enable voice input in settings to use this feature.');
      return;
    }

    try {
      setIsListening(true);
      
      // For demo purposes, we'll simulate voice input
      setTimeout(() => {
        const sampleInputs = [
          'Spent 500 rupees on groceries',
          'Earned 2000 dollars from freelancing',
          'Paid 150 for utilities',
          'Bought coffee for 80 rupees'
        ];
        
        const randomInput = sampleInputs[Math.floor(Math.random() * sampleInputs.length)];
        parseVoiceInput(randomInput);
        setIsListening(false);
      }, 2000);
      
    } catch (error) {
      console.error('Voice input error:', error);
      Alert.alert('Error', 'Failed to process voice input');
      setIsListening(false);
    }
  };

  const parseVoiceInput = (voiceText: string) => {
    // Simple parsing logic for demo
    const lowerText = voiceText.toLowerCase();
    
    // Extract amount
    const amountMatch = lowerText.match(/(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      setAmount(amountMatch[1]);
    }
    
    // Detect transaction type
    if (lowerText.includes('earned') || lowerText.includes('received') || lowerText.includes('income')) {
      setTransactionType('income');
    } else {
      setTransactionType('expense');
    }
    
    // Try to match category
    const foundCategory = categories.find(cat => 
      lowerText.includes(cat.name.toLowerCase()) ||
      (cat.name === 'Groceries' && (lowerText.includes('grocery') || lowerText.includes('food'))) ||
      (cat.name === 'Utilities' && lowerText.includes('utility')) ||
      (cat.name === 'Eating Out' && (lowerText.includes('coffee') || lowerText.includes('restaurant')))
    );
    
    if (foundCategory) {
      setSelectedCategory(foundCategory);
    }
    
    // Set description
    setDescription(voiceText);
    
    Alert.alert('Voice Input Processed', `Parsed: ${voiceText}`, [
      { text: 'Edit', style: 'default' },
      { text: 'Add Transaction', onPress: handleSubmit }
    ]);
  };

  const handleSubmit = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Please fill in amount and select a category');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numAmount,
          category_id: selectedCategory.id,
          category_name: selectedCategory.name,
          transaction_type: transactionType,
          description: description.trim(),
          currency: settings.default_currency,
          transaction_date: selectedDate.toISOString().split('T')[0],
          is_voice_input: isListening,
        }),
      });

      if (response.ok) {
        const newTransaction = await response.json();
        setTransactions(prev => [newTransaction, ...prev]);
        
        // Update local storage
        const updatedTransactions = [newTransaction, ...transactions];
        await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
        
        Alert.alert('Success', 'Transaction added successfully!');
        
        // Reset form
        setAmount('');
        setDescription('');
        setSelectedCategory(null);
        setTransactionType('expense');
      } else {
        throw new Error('Failed to add transaction');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = settings.default_currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        { backgroundColor: item.color + '20', borderColor: item.color }
      ]}
      onPress={() => {
        setSelectedCategory(item);
        setShowCategoryModal(false);
      }}
    >
      <Ionicons name={item.icon as any} size={24} color={item.color} />
      <Text style={[styles.categoryText, { color: item.color }]}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={[styles.transactionItem, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.categoryIndicator,
          { backgroundColor: item.transaction_type === 'income' ? '#4ECDC4' : '#FF6B6B' }
        ]}>
          <Ionicons 
            name={item.transaction_type === 'income' ? 'arrow-up' : 'arrow-down'} 
            size={16} 
            color="#fff" 
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={[styles.transactionCategory, { color: settings.dark_mode ? '#fff' : '#333' }]}>
            {item.category_name}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.transaction_date)}
          </Text>
          {item.description && (
            <Text style={styles.transactionDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { 
            color: item.transaction_type === 'income' ? '#4ECDC4' : '#FF6B6B',
          }
        ]}>
          {item.transaction_type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        {item.is_voice_input && (
          <Ionicons name="mic" size={12} color="#999" style={styles.voiceIcon} />
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ExpenseTracker...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: settings.dark_mode ? '#121212' : '#f8f9fa' }]}>
        <StatusBar style={settings.dark_mode ? "light" : "dark"} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: settings.dark_mode ? '#fff' : '#333' }]}>
            ExpenseTracker
          </Text>
          <Text style={[styles.subtitle, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
            Track your expenses with voice input
          </Text>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              {/* Voice Input Button */}
              <TouchableOpacity
                style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
                onPress={handleVoiceInput}
                disabled={isListening}
              >
                <Ionicons 
                  name={isListening ? "mic" : "mic-outline"} 
                  size={32} 
                  color={isListening ? "#fff" : "#FF6B6B"} 
                />
                <Text style={[styles.voiceButtonText, isListening && styles.voiceButtonTextActive]}>
                  {isListening ? 'Listening...' : 'Tap to speak'}
                </Text>
              </TouchableOpacity>

              {/* Transaction Type Toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'expense' && styles.typeButtonActive,
                    { backgroundColor: transactionType === 'expense' ? '#FF6B6B' : '#e0e0e0' }
                  ]}
                  onPress={() => setTransactionType('expense')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: transactionType === 'expense' ? '#fff' : '#666' }
                  ]}>
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'income' && styles.typeButtonActive,
                    { backgroundColor: transactionType === 'income' ? '#4ECDC4' : '#e0e0e0' }
                  ]}
                  onPress={() => setTransactionType('income')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    { color: transactionType === 'income' ? '#fff' : '#666' }
                  ]}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Amount ({settings.default_currency})
                </Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>
                    {settings.default_currency === 'INR' ? '₹' : '$'}
                  </Text>
                  <TextInput
                    style={[styles.amountInput, { color: settings.dark_mode ? '#fff' : '#333' }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Category Selection */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Category
                </Text>
                <TouchableOpacity
                  style={[
                    styles.categorySelector,
                    { 
                      backgroundColor: selectedCategory ? selectedCategory.color + '20' : '#e0e0e0',
                      borderColor: selectedCategory ? selectedCategory.color : '#ccc'
                    }
                  ]}
                  onPress={() => setShowCategoryModal(true)}
                >
                  {selectedCategory ? (
                    <View style={styles.selectedCategory}>
                      <Ionicons 
                        name={selectedCategory.icon as any} 
                        size={20} 
                        color={selectedCategory.color} 
                      />
                      <Text style={[styles.selectedCategoryText, { color: selectedCategory.color }]}>
                        {selectedCategory.name}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>Select Category</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Description Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Description (Optional)
                </Text>
                <TextInput
                  style={[styles.descriptionInput, { color: settings.dark_mode ? '#fff' : '#333' }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter description..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: transactionType === 'expense' ? '#FF6B6B' : '#4ECDC4' }
                ]}
                onPress={handleSubmit}
              >
                <Ionicons 
                  name="add-circle-outline" 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.submitButtonText}>
                  Add {transactionType === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </TouchableOpacity>

              {/* Recent Transactions */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Recent Transactions
                </Text>
                {transactions.length > 0 ? (
                  <FlatList
                    data={transactions.slice(0, 5)}
                    renderItem={renderTransaction}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    style={styles.transactionsList}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No transactions yet</Text>
                    <Text style={styles.emptySubtext}>Add your first transaction to get started</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Category Modal */}
          <Modal
            visible={showCategoryModal}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <SafeAreaView style={[styles.modalContainer, { backgroundColor: settings.dark_mode ? '#121212' : '#fff' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Select Category
                </Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close" size={24} color={settings.dark_mode ? '#fff' : '#333'} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={categories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.categoryGrid}
              />
            </SafeAreaView>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  voiceButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  voiceButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  voiceButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  voiceButtonTextActive: {
    color: '#fff',
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  typeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B6B',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 16,
  },
  categorySelector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCategoryText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  transactionsList: {
    maxHeight: 400,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  voiceIcon: {
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  categoryGrid: {
    padding: 16,
  },
  categoryItem: {
    flex: 1,
    margin: 8,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  categoryText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});