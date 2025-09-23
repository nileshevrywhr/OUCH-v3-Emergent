import React, { useContext, useMemo, useState } from 'react';
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

type SortOption = 'amount_desc' | 'amount_asc' | 'name_asc' | 'count_desc';

export default function HomeScreen() {
  const { transactions, refreshData, settings } = useContext(AppContext);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('amount_desc');

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
      case 'amount_desc':
        return sortedCategories.sort((a, b) => b.amount - a.amount);
      case 'amount_asc':
        return sortedCategories.sort((a, b) => a.amount - b.amount);
      case 'name_asc':
        return sortedCategories.sort((a, b) => a.name.localeCompare(b.name));
      case 'count_desc':
        return sortedCategories.sort((a, b) => b.count - a.count);
      default:
        return sortedCategories.sort((a, b) => b.amount - a.amount);
    }
  }, [monthlyData.monthlyTransactions, sortBy]);

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

