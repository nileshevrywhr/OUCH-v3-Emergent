import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext, Transaction } from '../index';

export default function SummaryScreen() {
  const { transactions, refreshData, settings } = useContext(AppContext);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Filter transactions by selected period
  const getFilteredTransactions = () => {
    const days = parseInt(selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return transactions.filter(t => 
      new Date(t.transaction_date) >= cutoffDate
    );
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netAmount = totalIncome - totalExpense;

  // Category breakdown
  const getCategoryBreakdown = () => {
    const breakdown: { [key: string]: { amount: number; count: number; color: string } } = {};
    
    filteredTransactions.forEach(t => {
      if (!breakdown[t.category_name]) {
        breakdown[t.category_name] = { amount: 0, count: 0, color: '#FF6B6B' };
      }
      breakdown[t.category_name].amount += t.amount;
      breakdown[t.category_name].count += 1;
    });

    return Object.entries(breakdown).map(([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.amount - a.amount);
  };

  const categoryBreakdown = getCategoryBreakdown();

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

  const renderCategoryBreakdown = ({ item }: { item: any }) => {
    const percentage = totalExpense > 0 ? (item.amount / totalExpense * 100) : 0;
    
    return (
      <View style={[styles.categoryBreakdownItem, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
        <View style={styles.categoryBreakdownLeft}>
          <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
          <Text style={[styles.categoryBreakdownName, { color: settings.dark_mode ? '#fff' : '#333' }]}>
            {item.name}
          </Text>
        </View>
        <View style={styles.categoryBreakdownRight}>
          <Text style={[styles.categoryBreakdownAmount, { color: settings.dark_mode ? '#fff' : '#333' }]}>
            {formatCurrency(item.amount)}
          </Text>
          <Text style={styles.categoryBreakdownPercentage}>
            {percentage.toFixed(1)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: settings.dark_mode ? '#121212' : '#f8f9fa' }]}>
      <View style={styles.header}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7', '30', '90'] as const).map((period) => (
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
                {period}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { backgroundColor: '#4ECDC4' }]}>
            <Ionicons name="arrow-up" size={24} color="#fff" />
            <Text style={styles.summaryCardTitle}>Income</Text>
            <Text style={styles.summaryCardAmount}>{formatCurrency(totalIncome)}</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: '#FF6B6B' }]}>
            <Ionicons name="arrow-down" size={24} color="#fff" />
            <Text style={styles.summaryCardTitle}>Expenses</Text>
            <Text style={styles.summaryCardAmount}>{formatCurrency(totalExpense)}</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: netAmount >= 0 ? '#4ECDC4' : '#FF6B6B' }]}>
            <Ionicons name="analytics" size={24} color="#fff" />
            <Text style={styles.summaryCardTitle}>Net</Text>
            <Text style={styles.summaryCardAmount}>{formatCurrency(netAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
            Category Breakdown
          </Text>
          <FlatList
            data={categoryBreakdown.slice(0, 5)}
            renderItem={renderCategoryBreakdown}
            keyExtractor={(item) => item.name}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
          Recent Transactions
        </Text>
        <FlatList
          data={filteredTransactions.slice(0, 10)}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Add your first transaction to get started</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 16,
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
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  summaryCardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.9,
  },
  summaryCardAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  section: {
    flex: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  categoryBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryBreakdownName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryBreakdownRight: {
    alignItems: 'flex-end',
  },
  categoryBreakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBreakdownPercentage: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
});