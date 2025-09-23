import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../_layout';

export default function SettingsScreen() {
  const { settings, updateSettings, categories, transactions } = useContext(AppContext);

  const handleCurrencyChange = (currency: 'INR' | 'USD') => {
    updateSettings({ default_currency: currency });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: settings.dark_mode ? '#121212' : '#f8f9fa' }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* App Settings */}
          <View style={[styles.section, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
              General Settings
            </Text>

            {/* Currency Setting */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="cash-outline" size={24} color="#4ECDC4" />
                <Text style={[styles.settingText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Default Currency
                </Text>
              </View>
              <View style={styles.currencyToggle}>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    settings.default_currency === 'INR' && styles.currencyButtonActive,
                    { backgroundColor: settings.default_currency === 'INR' ? '#4ECDC4' : '#e0e0e0' }
                  ]}
                  onPress={() => handleCurrencyChange('INR')}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    { color: settings.default_currency === 'INR' ? '#fff' : '#666' }
                  ]}>
                    INR (₹)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    settings.default_currency === 'USD' && styles.currencyButtonActive,
                    { backgroundColor: settings.default_currency === 'USD' ? '#4ECDC4' : '#e0e0e0' }
                  ]}
                  onPress={() => handleCurrencyChange('USD')}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    { color: settings.default_currency === 'USD' ? '#fff' : '#666' }
                  ]}>
                    USD ($)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dark Mode Toggle */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={24} color="#BB8FCE" />
                <Text style={[styles.settingText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={settings.dark_mode}
                onValueChange={(value) => updateSettings({ dark_mode: value })}
                trackColor={{ false: '#e0e0e0', true: '#4ECDC4' }}
                thumbColor={settings.dark_mode ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* Voice Input Toggle */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="mic-outline" size={24} color="#FFA07A" />
                <Text style={[styles.settingText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Voice Input
                </Text>
              </View>
              <Switch
                value={settings.voice_enabled}
                onValueChange={(value) => updateSettings({ voice_enabled: value })}
                trackColor={{ false: '#e0e0e0', true: '#4ECDC4' }}
                thumbColor={settings.voice_enabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* Cloud Sync Toggle */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="cloud-outline" size={24} color="#45B7D1" />
                <View>
                  <Text style={[styles.settingText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                    Cloud Sync
                  </Text>
                  <Text style={styles.settingSubtext}>
                    Coming Soon - Supabase Integration
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.sync_enabled}
                onValueChange={(value) => updateSettings({ sync_enabled: value })}
                trackColor={{ false: '#e0e0e0', true: '#4ECDC4' }}
                thumbColor={settings.sync_enabled ? '#fff' : '#f4f3f4'}
                disabled={true}
              />
            </View>
          </View>

          {/* App Statistics */}
          <View style={[styles.section, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
              Statistics
            </Text>
            
            <View style={styles.statItem}>
              <View style={styles.statLeft}>
                <Ionicons name="receipt-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.statLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                  Total Transactions
                </Text>
              </View>
              <Text style={[styles.statValue, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                {transactions.length}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={styles.statLeft}>
                <Ionicons name="pricetag-outline" size={20} color="#4ECDC4" />
                <Text style={[styles.statLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                  Categories Available
                </Text>
              </View>
              <Text style={[styles.statValue, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                {categories.length}
              </Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statLeft}>
                <Ionicons name="calendar-outline" size={20} color="#FFA07A" />
                <Text style={[styles.statLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                  This Month's Transactions
                </Text>
              </View>
              <Text style={[styles.statValue, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                {transactions.filter(t => {
                  const transactionDate = new Date(t.transaction_date);
                  const currentDate = new Date();
                  return transactionDate.getMonth() === currentDate.getMonth() && 
                         transactionDate.getFullYear() === currentDate.getFullYear();
                }).length}
              </Text>
            </View>
          </View>

          {/* App Info */}
          <View style={[styles.section, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
              About ExpenseTracker
            </Text>
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                Version
              </Text>
              <Text style={[styles.infoValue, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                1.0.0
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                Features
              </Text>
              <Text style={[styles.infoValue, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Voice Input, Charts, Multi-Currency
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                Storage
              </Text>
              <Text style={[styles.infoValue, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Local + Cloud Backup Ready
              </Text>
            </View>
          </View>

          {/* Feature Highlights */}
          <View style={[styles.section, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
              What's New
            </Text>
            
            <View style={styles.featureItem}>
              <Ionicons name="mic" size={20} color="#FF6B6B" />
              <Text style={[styles.featureText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Voice-powered expense tracking
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="bar-chart" size={20} color="#4ECDC4" />
              <Text style={[styles.featureText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Beautiful charts and analytics
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="moon" size={20} color="#BB8FCE" />
              <Text style={[styles.featureText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Dark mode support
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="globe" size={20} color="#FFA07A" />
              <Text style={[styles.featureText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Multi-currency support (INR & USD)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  settingSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    marginLeft: 12,
  },
  currencyToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  currencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  currencyButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currencyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
});
