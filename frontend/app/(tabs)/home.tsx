import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../_layout';

export default function HomeScreen() {
  const { transactions, refreshData, settings } = useContext(AppContext);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Calculate totals for current month
  const monthlyData = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const totalIncome = monthlyTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthlyTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Category breakdown
    const categoryBreakdown: { [key: string]: number } = {};
    monthlyTransactions
      .filter(t => t.transaction_type === 'expense')
      .forEach(t => {
        categoryBreakdown[t.category_name] = (categoryBreakdown[t.category_name] || 0) + t.amount;
      });

    const sortedCategories = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      categoryBreakdown: sortedCategories,
      transactionCount: monthlyTransactions.length,
    };
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    const symbol = settings.default_currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTransaction = ({ item }: { item: any }) => (
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
          { color: item.transaction_type === 'income' ? '#4ECDC4' : '#FF6B6B' }
        ]}>
          {item.transaction_type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        {item.is_voice_input && (
          <Ionicons name="mic" size={12} color="#999" style={styles.voiceIcon} />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: settings.dark_mode ? '#121212' : '#f8f9fa' }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
            This Month
          </Text>
          <Text style={[styles.headerSubtitle, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: '#4ECDC4' }]}>
            <Ionicons name="trending-up" size={24} color="#fff" />
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(monthlyData.totalIncome)}</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: '#FF6B6B' }]}>
            <Ionicons name="trending-down" size={24} color="#fff" />
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(monthlyData.totalExpense)}</Text>
          </View>
          
          <View style={[
            styles.summaryCard, 
            { backgroundColor: monthlyData.netAmount >= 0 ? '#4ECDC4' : '#FF6B6B' }
          ]}>
            <Ionicons name="analytics" size={24} color="#fff" />
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(monthlyData.netAmount)}</Text>
          </View>
        </View>

        {/* Bottom spacing for better scrolling */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    minHeight: 100,
    justifyContent: 'center',
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    opacity: 0.9,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
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
  bottomSpacing: {
    height: 20,
  },
});
