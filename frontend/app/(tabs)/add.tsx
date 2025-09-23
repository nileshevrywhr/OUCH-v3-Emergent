import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { AppContext } from '../_layout';

export default function AddExpenseScreen() {
  const { categories, addTransaction, settings } = useContext(AppContext);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize voice recognition
  React.useEffect(() => {
    initializeVoice();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const initializeVoice = async () => {
    try {
      Voice.onSpeechStart = () => console.log('Speech recognition started');
      Voice.onSpeechRecognized = () => console.log('Speech recognized');
      Voice.onSpeechResults = (event: SpeechResultsEvent) => {
        if (event.value && event.value[0]) {
          parseVoiceInput(event.value[0]);
        }
      };
      Voice.onSpeechError = (event: SpeechErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        Alert.alert('Voice Recognition Error', 'Failed to recognize speech. Please try again.');
      };
      Voice.onSpeechEnd = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      // Request microphone permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'ExpenseTracker needs access to your microphone for voice input.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Microphone permission denied');
        }
      }
    } catch (error) {
      console.error('Error initializing voice:', error);
    }
  };

  const handleWebVoiceFallback = () => {
    const sampleInputs = [
      'Spent 500 rupees on groceries',
      'Earned 2000 dollars from freelancing', 
      'Paid 150 for utilities',
      'Bought coffee for 80 rupees'
    ];
    
    const randomInput = sampleInputs[Math.floor(Math.random() * sampleInputs.length)];
    setDescription(randomInput);
    Alert.alert('Voice Input Simulated', `Added: "${randomInput}"`);
  };

  const handleVoiceInput = async () => {
    if (!settings.voice_enabled) {
      Alert.alert('Voice Input Disabled', 'Enable voice input in settings to use this feature.');
      return;
    }

    try {
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
        return;
      }

      // Check if Voice is available (null check for web compatibility)
      if (!Voice || typeof Voice.isAvailable !== 'function') {
        // Fallback for web or when Voice is not available
        if (Platform.OS === 'web') {
          handleWebVoiceFallback();
          return;
        } else {
          Alert.alert('Voice Recognition Not Available', 'Speech recognition is not available on this device.');
          return;
        }
      }

      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert('Voice Recognition Not Available', 'Speech recognition is not available on this device.');
        return;
      }

      setIsListening(true);
      await Voice.start('en-US');
      
      setTimeout(async () => {
        if (isListening) {
          try {
            await Voice.stop();
            setIsListening(false);
          } catch (error) {
            console.error('Error stopping voice recognition:', error);
          }
        }
      }, 10000);
      
    } catch (error) {
      console.error('Voice input error:', error);
      setIsListening(false);
      
      // Fallback for web testing
      if (Platform.OS === 'web') {
        const sampleInputs = [
          'Spent 500 rupees on groceries',
          'Earned 2000 dollars from freelancing', 
          'Paid 150 for utilities',
          'Bought coffee for 80 rupees'
        ];
        
        const randomInput = sampleInputs[Math.floor(Math.random() * sampleInputs.length)];
        setTimeout(() => {
          parseVoiceInput(randomInput);
        }, 1500);
      } else {
        Alert.alert('Error', 'Failed to start voice recognition. Please try again.');
      }
    }
  };

  const parseVoiceInput = (voiceText: string) => {
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
      await addTransaction({
        amount: numAmount,
        category_id: selectedCategory.id,
        category_name: selectedCategory.name,
        transaction_type: transactionType,
        description: description.trim(),
        currency: settings.default_currency,
        transaction_date: selectedDate.toISOString().split('T')[0],
        is_voice_input: false,
      });

      Alert.alert('Success', 'Transaction added successfully!');
      
      // Reset form
      setAmount('');
      setDescription('');
      setSelectedCategory(null);
      setTransactionType('expense');
      setSelectedDate(new Date());
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
    }
  };

  const renderCategoryItem = ({ item }: { item: any }) => (
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: settings.dark_mode ? '#121212' : '#f8f9fa' }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Transaction Date
              </Text>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={[styles.dateText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) {
                      setSelectedDate(date);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Amount Input with Type Toggle */}
            <View style={styles.inputContainer}>
              <View style={styles.amountLabelRow}>
                <Text style={[styles.label, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Amount ({settings.default_currency})
                </Text>
                
                <View style={styles.compactTypeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.compactTypeButton,
                      transactionType === 'expense' && styles.compactTypeButtonActive,
                      { backgroundColor: transactionType === 'expense' ? '#FF6B6B' : '#f0f0f0' }
                    ]}
                    onPress={() => setTransactionType('expense')}
                  >
                    <Text style={[
                      styles.compactTypeButtonText,
                      { color: transactionType === 'expense' ? '#fff' : '#666' }
                    ]}>
                      Expense
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.compactTypeButton,
                      transactionType === 'income' && styles.compactTypeButtonActive,
                      { backgroundColor: transactionType === 'income' ? '#4ECDC4' : '#f0f0f0' }
                    ]}
                    onPress={() => setTransactionType('income')}
                  >
                    <Text style={[
                      styles.compactTypeButtonText,
                      { color: transactionType === 'income' ? '#fff' : '#666' }
                    ]}>
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.amountInputContainer}>
                <Text style={[
                  styles.currencySymbol,
                  { color: transactionType === 'expense' ? '#FF6B6B' : '#4ECDC4' }
                ]}>
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

            {/* Voice Input Button */}
            <TouchableOpacity
              style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
              onPress={handleVoiceInput}
              disabled={isListening}
            >
              <Ionicons 
                name={isListening ? "mic" : "mic-outline"} 
                size={28} 
                color={isListening ? "#fff" : "#FF6B6B"} 
              />
              <Text style={[styles.voiceButtonText, isListening && styles.voiceButtonTextActive]}>
                {isListening ? 'Listening... (Tap to stop)' : 'Tap to speak'}
              </Text>
            </TouchableOpacity>
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
  content: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateSelector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTypeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  compactTypeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  compactTypeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compactTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
  voiceButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
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
