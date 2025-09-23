import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import DashboardScreen from './screens/DashboardScreen';
import AddExpenseScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';

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

const Tab = createBottomTabNavigator();

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

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      await refreshData();
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const categoriesResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories`);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
        await AsyncStorage.setItem('categories', JSON.stringify(categoriesData));
      }

      const transactionsResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/transactions?limit=100`);
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
        await AsyncStorage.setItem('transactions', JSON.stringify(transactionsData));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        const newTransaction = await response.json();
        setTransactions(prev => [newTransaction, ...prev]);
        const updatedTransactions = [newTransaction, ...transactions];
        await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
      } else {
        throw new Error('Failed to add transaction');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ExpenseTracker...</Text>
      </View>
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
        <NavigationContainer>
          <StatusBar style={settings.dark_mode ? "light" : "dark"} />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: keyof typeof Ionicons.glyphMap;
                
                if (route.name === 'Home') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Add') {
                  iconName = focused ? 'add-circle' : 'add-circle-outline';
                } else if (route.name === 'Settings') {
                  iconName = focused ? 'settings' : 'settings-outline';
                } else {
                  iconName = 'help-circle-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#FF6B6B',
              tabBarInactiveTintColor: 'gray',
              tabBarStyle: {
                backgroundColor: settings.dark_mode ? '#1a1a1a' : '#ffffff',
                borderTopColor: settings.dark_mode ? '#333' : '#e0e0e0',
                height: 80,
                paddingBottom: 20,
                paddingTop: 10,
              },
              headerStyle: {
                backgroundColor: settings.dark_mode ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: settings.dark_mode ? '#ffffff' : '#000000',
              headerTitleStyle: {
                fontWeight: '600',
              },
            })}
          >
            <Tab.Screen 
              name="Home" 
              component={DashboardScreen}
              options={{ title: 'Dashboard' }}
            />
            <Tab.Screen 
              name="Add" 
              component={AddExpenseScreen}
              options={{ title: 'Add Expense' }}
            />
            <Tab.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
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