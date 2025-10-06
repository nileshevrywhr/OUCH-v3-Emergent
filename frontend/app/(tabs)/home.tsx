import React, { useContext, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../_layout';

type SortOption = 'amount' | 'name' | 'count';
type SortDirection = 'asc' | 'desc';

// Move the color function outside the component to avoid re-creation
const getColorForCategory = (categoryName: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#D5A6BD'
  ];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function HomeScreen() {
  const { transactions, refreshData, settings, getExpenseTypeAnalytics } = useContext(AppContext);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expenseTypeData, setExpenseTypeData] = useState<any>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    await fetchExpenseTypeData();
    setRefreshing(false);
  };

  // Fetch expense type data when component mounts or transactions change
  const fetchExpenseTypeData = async () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const data = await getExpenseTypeAnalytics(currentYear, currentMonth);
    setExpenseTypeData(data);
  };

  React.useEffect(() => {
    fetchExpenseTypeData();
  }, [transactions]); // Re-fetch when transactions change

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

    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      transactionCount: monthlyTransactions.length,
      monthlyTransactions,
    };
  }, [transactions]);

  // Calculate category-wise spending with sorting
  const categorySpending = useMemo(() => {
    const categoryData: { [key: string]: { amount: number; count: number; name: string; color: string } } = {};
    
    monthlyData.monthlyTransactions
      .filter(t => t.transaction_type === 'expense')
      .forEach(t => {
        if (!categoryData[t.category_name]) {
          categoryData[t.category_name] = {
            amount: 0,
            count: 0,
            name: t.category_name,
            color: getColorForCategory(t.category_name),
          };
        }
        categoryData[t.category_name].amount += t.amount;
        categoryData[t.category_name].count += 1;
      });

    const sortedCategories = Object.values(categoryData);

    // Apply sorting
    switch (sortBy) {
      case 'amount':
        return sortDirection === 'desc' 
          ? sortedCategories.sort((a, b) => b.amount - a.amount)
          : sortedCategories.sort((a, b) => a.amount - b.amount);
      case 'name':
        return sortDirection === 'desc'
          ? sortedCategories.sort((a, b) => b.name.localeCompare(a.name))
          : sortedCategories.sort((a, b) => a.name.localeCompare(b.name));
      case 'count':
        return sortDirection === 'desc'
          ? sortedCategories.sort((a, b) => b.count - a.count)
          : sortedCategories.sort((a, b) => a.count - b.count);
      default:
        return sortedCategories.sort((a, b) => b.amount - a.amount);
    }
  }, [monthlyData.monthlyTransactions, sortBy, sortDirection]);

  const formatCurrency = (amount: number) => {
    const symbol = settings.default_currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getSortIcon = (option: SortOption) => {
    const isActive = sortBy === option;
    if (!isActive) {
      // Show base icon when not active
      switch (option) {
        case 'amount': return 'swap-vertical-outline';
        case 'name': return 'text-outline';
        case 'count': return 'bar-chart-outline';
      }
    }
    
    // Show directional icon when active
    switch (option) {
      case 'amount':
        return sortDirection === 'desc' ? 'trending-down' : 'trending-up';
      case 'name':
        return sortDirection === 'desc' ? 'arrow-down' : 'arrow-up';
      case 'count':
        return sortDirection === 'desc' ? 'bar-chart' : 'bar-chart-outline';
    }
  };

  const getSortLabel = (option: SortOption) => {
    const baseLabels = {
      amount: 'Amount',
      name: 'Name',
      count: 'Frequency'
    };
    
    if (sortBy !== option) {
      return baseLabels[option];
    }
    
    return `${baseLabels[option]} ${sortDirection === 'desc' ? '↓' : '↑'}`;
  };

  const handleSortPress = (option: SortOption) => {
    if (sortBy === option) {
      // Toggle direction if same option
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // Switch to new option with desc as default
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  const renderCategoryItem = ({ item }: { item: any }) => {
    const percentage = monthlyData.totalExpense > 0 ? (item.amount / monthlyData.totalExpense * 100) : 0;
    
    return (
      <View style={[styles.categoryItem, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
        <View style={styles.categoryLeft}>
          <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: settings.dark_mode ? '#fff' : '#333' }]}>
              {item.name}
            </Text>
            <Text style={styles.categoryMeta}>
              {item.count} transaction{item.count !== 1 ? 's' : ''} • {percentage.toFixed(1)}%
            </Text>
          </View>
        </View>
        <Text style={[styles.categoryAmount, { color: settings.dark_mode ? '#fff' : '#333' }]}>
          {formatCurrency(item.amount)}
        </Text>
      </View>
    );
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
        <View style={styles.transactionMeta}>
          {/* User Tag */}
          <View style={[
            styles.userTag,
            { 
              backgroundColor: item.user === 'spouse' ? '#FF6B6B' : '#4ECDC4'
            }
          ]}>
            <Ionicons 
              name={item.user === 'spouse' ? 'people' : 'person'} 
              size={10} 
              color="#fff" 
            />
            <Text style={styles.userTagText}>
              {item.user === 'spouse' ? 'Spouse' : 'Me'}
            </Text>
          </View>
          {item.is_voice_input && (
            <Ionicons name="mic" size={12} color="#999" style={styles.voiceIcon} />
          )}
        </View>
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

        {/* Expense Type Breakdown Section */}
        {expenseTypeData && expenseTypeData.expense_types && expenseTypeData.expense_types.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
              Expense Breakdown by Type
            </Text>
            <Text style={[styles.sectionSubtitle, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
              {formatCurrency(expenseTypeData.total_expenses)} total expenses
            </Text>
            
            <View style={styles.expenseTypeContainer}>
              {expenseTypeData.expense_types.map((type: any, index: number) => {
                const getTypeIcon = (typeName: string) => {
                  switch (typeName) {
                    case 'need': return 'basket-outline';
                    case 'want': return 'heart-outline';  
                    case 'investment': return 'trending-up-outline';
                    default: return 'help-circle-outline';
                  }
                };

                const getTypeColor = (typeName: string) => {
                  switch (typeName) {
                    case 'need': return '#4ECDC4';
                    case 'want': return '#FF6B6B';
                    case 'investment': return '#45B7D1';
                    default: return '#999';
                  }
                };

                return (
                  <View key={index} style={[
                    styles.expenseTypeCard,
                    { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }
                  ]}>
                    <View style={styles.expenseTypeLeft}>
                      <View style={[
                        styles.expenseTypeIcon,
                        { backgroundColor: getTypeColor(type.type) }
                      ]}>
                        <Ionicons 
                          name={getTypeIcon(type.type) as any}
                          size={20} 
                          color="#fff" 
                        />
                      </View>
                      <View>
                        <Text style={[
                          styles.expenseTypeName,
                          { color: settings.dark_mode ? '#fff' : '#333' }
                        ]}>
                          {type.type.charAt(0).toUpperCase() + type.type.slice(1)}s
                        </Text>
                        <Text style={styles.expenseTypeCount}>
                          {type.count} transaction{type.count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.expenseTypeRight}>
                      <Text style={[
                        styles.expenseTypePercentage,
                        { color: getTypeColor(type.type) }
                      ]}>
                        {type.percentage}%
                      </Text>
                      <Text style={[
                        styles.expenseTypeAmount,
                        { color: settings.dark_mode ? '#fff' : '#333' }
                      ]}>
                        {formatCurrency(type.amount)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Category Spending Section */}
        {categorySpending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Category Spending
              </Text>
              
              {/* Sort Options */}
              <View style={styles.sortContainer}>
                {(['amount', 'name', 'count'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.sortButton,
                      sortBy === option && styles.sortButtonActive,
                      { 
                        backgroundColor: sortBy === option ? '#FF6B6B' : (settings.dark_mode ? '#1e1e1e' : '#fff')
                      }
                    ]}
                    onPress={() => handleSortPress(option)}
                  >
                    <Ionicons 
                      name={getSortIcon(option)} 
                      size={14} 
                      color={sortBy === option ? '#fff' : (settings.dark_mode ? '#fff' : '#333')} 
                    />
                    <Text style={[
                      styles.sortButtonText,
                      { color: sortBy === option ? '#fff' : (settings.dark_mode ? '#fff' : '#333') }
                    ]}>
                      {getSortLabel(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <FlatList
              data={categorySpending}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.name}
              scrollEnabled={false}
            />
          </View>
        )}

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
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  expenseTypeContainer: {
    gap: 12,
  },
  expenseTypeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  expenseTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseTypeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  expenseTypeCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  expenseTypeRight: {
    alignItems: 'flex-end',
  },
  expenseTypePercentage: {
    fontSize: 20,
    fontWeight: '700',
  },
  expenseTypeAmount: {
    fontSize: 14,
    fontWeight: '500',
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
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  userTagText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 2,
  },
  voiceIcon: {
    marginRight: 4,
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
  sectionHeader: {
    marginBottom: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortButtonActive: {
    borderColor: '#FF6B6B',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  categoryItem: {
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
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
});