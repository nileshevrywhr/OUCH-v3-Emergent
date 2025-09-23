import React, { useContext, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppContext } from '../_layout';

export default function TransactionsScreen() {
  const { transactions, refreshData, settings, categories, updateTransaction, deleteTransaction } = useContext(AppContext);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | 90 | 'all'>('all');
  
  // Refs for gesture handling
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<any>(null);
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Edit transaction functions
  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditDescription(transaction.description || '');
    setEditType(transaction.transaction_type);
    setEditDate(new Date(transaction.transaction_date));
    
    // Find the category
    const category = categories.find(cat => cat.id === transaction.category_id);
    setEditCategory(category || null);
    
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editAmount || !editCategory) {
      Alert.alert('Error', 'Please fill in amount and select a category');
      return;
    }

    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await updateTransaction(editingTransaction.id, {
        amount: numAmount,
        category_id: editCategory.id,
        category_name: editCategory.name,
        transaction_type: editType,
        description: editDescription.trim(),
        currency: settings.default_currency,
        transaction_date: editDate.toISOString().split('T')[0],
      });
      
      Alert.alert('Success', 'Transaction updated successfully!');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction. Please try again.');
    }
  };

  const handleDeleteTransaction = (transaction: any) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ${transaction.transaction_type} of ${formatCurrency(transaction.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              Alert.alert('Success', 'Transaction deleted successfully!');
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Filter transactions by selected period
  const getFilteredTransactions = () => {
    if (selectedPeriod === 'all') {
      return transactions;
    }
    
    const days = parseInt(selectedPeriod.toString());
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return transactions.filter(t => 
      new Date(t.transaction_date) >= cutoffDate
    );
  };

  const filteredTransactions = getFilteredTransactions();

  const formatCurrency = (amount: number) => {
    const symbol = settings.default_currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  // Right swipe action (Edit) 
  const renderRightAction = (item: any, dragX: Animated.AnimatedAddition) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    
    return (
      <TouchableOpacity
        style={styles.editAction}
        onPress={() => handleEditTransaction(item)}
      >
        <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
          <Ionicons name="create-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Edit</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Left swipe action (Delete)
  const renderLeftAction = (item: any, dragX: Animated.AnimatedAddition) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteTransaction(item)}
      >
        <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderTransaction = ({ item }: { item: any }) => (
    <Swipeable
      key={item.id}
      renderRightAction={(dragX) => renderRightAction(item, dragX)}
      renderLeftAction={(dragX) => renderLeftAction(item, dragX)}
      rightThreshold={30}
      leftThreshold={30}
    >
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
              <Text style={styles.transactionDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[
            styles.transactionAmount,
            { color: item.transaction_type === 'income' ? '#4ECDC4' : '#FF6B6B' }
          ]}>
            {item.transaction_type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <View style={styles.transactionMeta}>
            {item.is_voice_input && (
              <Ionicons name="mic" size={12} color="#999" style={styles.voiceIcon} />
            )}
            <Text style={styles.transactionCurrency}>
              {item.currency}
            </Text>
          </View>
        </View>
      </View>
    </Swipeable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No transactions found</Text>
      <Text style={styles.emptySubtext}>
        {selectedPeriod === 'all' 
          ? 'Add your first transaction to get started' 
          : `No transactions in the last ${selectedPeriod} days`
        }
      </Text>
    </View>
  );

  // Group transactions by date
  const groupTransactionsByDate = () => {
    const groups: { [key: string]: any[] } = {};
    
    filteredTransactions.forEach(transaction => {
      const dateKey = formatDate(transaction.transaction_date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      data: items,
      totalAmount: items.reduce((sum, item) => {
        return item.transaction_type === 'expense' 
          ? sum - item.amount 
          : sum + item.amount;
      }, 0)
    }));
  };

  const groupedTransactions = groupTransactionsByDate();

  const renderDateGroup = ({ item }: { item: any }) => (
    <View style={styles.dateGroup}>
      <View style={styles.dateHeader}>
        <Text style={[styles.dateText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
          {item.date}
        </Text>
        <Text style={[
          styles.dateTotalText,
          { color: item.totalAmount >= 0 ? '#4ECDC4' : '#FF6B6B' }
        ]}>
          {item.totalAmount >= 0 ? '+' : ''}{formatCurrency(Math.abs(item.totalAmount))}
        </Text>
      </View>
      {item.data.map((transaction: any) => (
        <View key={transaction.id} style={{ marginVertical: 1 }}>
          {renderTransaction({ item: transaction })}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: settings.dark_mode ? '#121212' : '#f8f9fa' }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
            Transactions
          </Text>
          <Text style={[styles.headerSubtitle, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Period Filter */}
        <View style={styles.filterContainer}>
          <View style={styles.periodSelector}>
            {(['7', '30', '90', 'all'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                  { 
                    backgroundColor: selectedPeriod === period ? '#FF6B6B' : (settings.dark_mode ? '#1e1e1e' : '#fff')
                  }
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodButtonText,
                  { color: selectedPeriod === period ? '#fff' : (settings.dark_mode ? '#fff' : '#333') }
                ]}>
                  {period === 'all' ? 'All' : `${period}d`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transactions List */}
        <FlatList
          data={groupedTransactions}
          renderItem={renderDateGroup}
          keyExtractor={(item) => item.date}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyContainer : undefined}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          windowSize={10}
        />

        {/* Edit Transaction Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <SafeAreaView style={[styles.modalContainer, { backgroundColor: settings.dark_mode ? '#121212' : '#fff' }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Text style={[styles.modalCancelButton, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Edit Transaction
                </Text>
                <TouchableOpacity onPress={handleSaveEdit}>
                  <Text style={styles.modalSaveButton}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                    Amount
                  </Text>
                  <View style={styles.amountContainer}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        editType === 'expense' && styles.typeButtonActive,
                        { backgroundColor: editType === 'expense' ? '#FF6B6B' : (settings.dark_mode ? '#1e1e1e' : '#f0f0f0') }
                      ]}
                      onPress={() => setEditType('expense')}
                    >
                      <Text style={[styles.typeButtonText, { color: editType === 'expense' ? '#fff' : (settings.dark_mode ? '#fff' : '#333') }]}>
                        Expense
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        editType === 'income' && styles.typeButtonActive,
                        { backgroundColor: editType === 'income' ? '#4ECDC4' : (settings.dark_mode ? '#1e1e1e' : '#f0f0f0') }
                      ]}
                      onPress={() => setEditType('income')}
                    >
                      <Text style={[styles.typeButtonText, { color: editType === 'income' ? '#fff' : (settings.dark_mode ? '#fff' : '#333') }]}>
                        Income
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[
                      styles.amountInput,
                      { 
                        backgroundColor: settings.dark_mode ? '#1e1e1e' : '#f8f9fa',
                        color: settings.dark_mode ? '#fff' : '#333',
                        borderColor: editType === 'income' ? '#4ECDC4' : '#FF6B6B'
                      }
                    ]}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    placeholder="Enter amount"
                    placeholderTextColor={settings.dark_mode ? '#666' : '#999'}
                    keyboardType="numeric"
                  />
                </View>

                {/* Category Selection */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                    Category
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#f8f9fa' }
                    ]}
                    onPress={() => setShowCategoryModal(true)}
                  >
                    <Text style={[styles.categoryButtonText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                      {editCategory ? editCategory.name : 'Select Category'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={settings.dark_mode ? '#fff' : '#333'} />
                  </TouchableOpacity>
                </View>

                {/* Date Selection */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                    Date
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#f8f9fa' }
                    ]}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                      {editDate.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={settings.dark_mode ? '#fff' : '#333'} />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                    Description (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.descriptionInput,
                      { 
                        backgroundColor: settings.dark_mode ? '#1e1e1e' : '#f8f9fa',
                        color: settings.dark_mode ? '#fff' : '#333'
                      }
                    ]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Add a note..."
                    placeholderTextColor={settings.dark_mode ? '#666' : '#999'}
                    multiline
                  />
                </View>
              </ScrollView>

              {/* Date Picker */}
              {showEditDatePicker && (
                <DateTimePicker
                  value={editDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEditDatePicker(false);
                    if (selectedDate) {
                      setEditDate(selectedDate);
                    }
                  }}
                />
              )}

              {/* Category Modal */}
              <Modal
                visible={showCategoryModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCategoryModal(false)}
              >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: settings.dark_mode ? '#121212' : '#fff' }]}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                      <Text style={[styles.modalCancelButton, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                      Select Category
                    </Text>
                    <View style={{ width: 60 }} />
                  </View>
                  <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.categoryItem,
                          { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#f8f9fa' },
                          editCategory?.id === item.id && styles.categoryItemSelected
                        ]}
                        onPress={() => {
                          setEditCategory(item);
                          setShowCategoryModal(false);
                        }}
                      >
                        <Text style={[
                          styles.categoryItemText,
                          { color: settings.dark_mode ? '#fff' : '#333' },
                          editCategory?.id === item.id && styles.categoryItemTextSelected
                        ]}>
                          {item.name}
                        </Text>
                        {editCategory?.id === item.id && (
                          <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </SafeAreaView>
              </Modal>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  periodButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateTotalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginVertical: 2,
    marginHorizontal: 16,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginTop: 4,
    lineHeight: 16,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  voiceIcon: {
    marginRight: 4,
  },
  transactionCurrency: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
  },
  // Swipe action styles
  editAction: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    marginRight: 16,
    borderRadius: 12,
  },
  deleteAction: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    marginLeft: 16,
    borderRadius: 12,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancelButton: {
    fontSize: 16,
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderColor: '#fff',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    textAlign: 'center',
  },
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonText: {
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    fontSize: 16,
  },
  descriptionInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  categoryItemSelected: {
    backgroundColor: '#FF6B6B20',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  categoryItemText: {
    fontSize: 16,
  },
  categoryItemTextSelected: {
    fontWeight: '600',
    color: '#FF6B6B',
  },
});
