import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import HomeScreen from './screens/HomeScreen';

// Types
export interface Transaction {
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

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_custom: boolean;
  created_at: string;
}

export interface AppSettings {
  default_currency: 'INR' | 'USD';
  dark_mode: boolean;
  voice_enabled: boolean;
  sync_enabled: boolean;
}

// Create Context
export const AppContext = React.createContext<{
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
  refreshData: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}>({
  transactions: [],
  categories: [],
  settings: { default_currency: 'INR', dark_mode: false, voice_enabled: true, sync_enabled: false },
  refreshData: () => {},
  addTransaction: async () => {},
  updateSettings: async () => {},
});

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

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        const newTransaction = await response.json();
        setTransactions(prev => [newTransaction, ...prev]);
        
        // Update local storage
        const updatedTransactions = [newTransaction, ...transactions];
        await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
        
        Alert.alert('Success', 'Transaction added successfully!');
      } else {
        throw new Error('Failed to add transaction');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ExpenseTracker...</Text>
      </SafeAreaView>
    );
  }

  const contextValue = {
    transactions,
    categories,
    settings,
    refreshData,
    addTransaction,
    updateSettings,
  };

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={contextValue}>
        <StatusBar style={settings.dark_mode ? "light" : "dark"} />
        <HomeScreen />
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
});