import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext, Category } from '../index';

export default function SettingsScreen() {
  const { settings, updateSettings, categories, refreshData } = useContext(AppContext);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#FF6B6B');

  const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#D5A6BD',
    '#82E0AA', '#F8D7DA', '#D4EDDA', '#CCE5FF', '#E2E3E5'
  ];

  const handleCurrencyChange = (currency: 'INR' | 'USD') => {
    updateSettings({ default_currency: currency });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          color: newCategoryColor,
          icon: 'tag',
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Category added successfully!');
        setNewCategoryName('');
        setNewCategoryColor('#FF6B6B');
        setShowAddCategory(false);
        await refreshData();
      } else {
        throw new Error('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category. Please try again.');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!category.is_custom) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? All transactions in this category will be moved to "Miscellaneous".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/categories/${category.id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Success', 'Category deleted successfully!');
                await refreshData();
              } else {
                throw new Error('Failed to delete category');
              }
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderCategoryItem = (category: Category) => (
    <View 
      key={category.id}
      style={[styles.categoryItem, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}
    >
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
        <Text style={[styles.categoryName, { color: settings.dark_mode ? '#fff' : '#333' }]}>
          {category.name}
        </Text>
        {!category.is_custom && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      {category.is_custom && (
        <TouchableOpacity
          onPress={() => handleDeleteCategory(category)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderColorPicker = () => (
    <View style={styles.colorPicker}>
      <Text style={[styles.modalLabel, { color: settings.dark_mode ? '#fff' : '#333' }]}>
        Choose Color
      </Text>
      <View style={styles.colorGrid}>
        {colors.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              newCategoryColor === color && styles.selectedColor,
            ]}
            onPress={() => setNewCategoryColor(color)}
          />
        ))}
      </View>
    </View>
  );

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

          {/* Categories Management */}
          <View style={[styles.section, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Categories
              </Text>
              <TouchableOpacity
                style={styles.addCategoryButton}
                onPress={() => setShowAddCategory(true)}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.categoriesList}>
              {categories.map(renderCategoryItem)}
            </View>
          </View>

          {/* App Info */}
          <View style={[styles.section, { backgroundColor: settings.dark_mode ? '#1e1e1e' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
              About
            </Text>
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                App Version
              </Text>
              <Text style={[styles.infoValue, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                1.0.0
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                Total Categories
              </Text>
              <Text style={[styles.infoValue, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                {categories.length}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Category Modal */}
      <Modal
        visible={showAddCategory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: settings.dark_mode ? '#121212' : '#fff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
              Add New Category
            </Text>
            <TouchableOpacity onPress={() => setShowAddCategory(false)}>
              <Ionicons name="close" size={24} color={settings.dark_mode ? '#fff' : '#333'} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.modalLabel, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                Category Name
              </Text>
              <TextInput
                style={[
                  styles.categoryNameInput,
                  { 
                    backgroundColor: settings.dark_mode ? '#1e1e1e' : '#f5f5f5',
                    color: settings.dark_mode ? '#fff' : '#333'
                  }
                ]}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Enter category name..."
                placeholderTextColor="#999"
              />
            </View>

            {renderColorPicker()}

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: newCategoryColor }]}
              onPress={handleAddCategory}
            >
              <Text style={styles.addButtonText}>Add Category</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  addCategoryButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
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
  modalContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryNameInput: {
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  colorPicker: {
    marginBottom: 32,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
  addButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});