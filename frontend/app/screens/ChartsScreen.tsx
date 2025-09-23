import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { AppContext } from '../_layout';

const { width } = Dimensions.get('window');

export default function ChartsScreen() {
  const { transactions, settings } = useContext(AppContext);
  const [selectedChart, setSelectedChart] = useState<'pie' | 'bar' | 'line'>('pie');
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');

  const formatCurrency = (amount: number) => {
    const symbol = settings.default_currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toFixed(0)}`;
  };

  // Filter transactions by period
  const getFilteredTransactions = () => {
    const days = parseInt(selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return transactions.filter(t => 
      new Date(t.transaction_date) >= cutoffDate
    );
  };

  const filteredTransactions = getFilteredTransactions();

  // Prepare data for pie chart (category breakdown)
  const getPieChartData = () => {
    const expenseTransactions = filteredTransactions.filter(t => t.transaction_type === 'expense');
    const categoryData: { [key: string]: { amount: number; color: string } } = {};
    
    expenseTransactions.forEach(t => {
      if (!categoryData[t.category_name]) {
        categoryData[t.category_name] = {
          amount: 0,
          color: getColorForCategory(t.category_name),
        };
      }
      categoryData[t.category_name].amount += t.amount;
    });

    return Object.entries(categoryData)
      .map(([name, data]) => ({
        value: data.amount,
        text: `${name}\n${formatCurrency(data.amount)}`,
        color: data.color,
        focused: false,
        labelPosition: 'outward' as const,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  };

  // Prepare data for bar chart (monthly comparison)
  const getBarChartData = () => {
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};
    
    filteredTransactions.forEach(t => {
      const monthKey = new Date(t.transaction_date).toLocaleDateString('en-US', { 
        month: 'short',
        year: 'numeric' 
      });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }
      
      if (t.transaction_type === 'income') {
        monthlyData[monthKey].income += t.amount;
      } else {
        monthlyData[monthKey].expense += t.amount;
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedMonths.map(month => ({
      label: month,
      value: monthlyData[month].expense,
      frontColor: '#FF6B6B',
      sideColor: '#FF4444',
      topColor: '#FF8888',
    }));
  };

  // Prepare data for line chart (daily spending trend)
  const getLineChartData = () => {
    const dailyData: { [key: string]: number } = {};
    const days = parseInt(selectedPeriod);
    
    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = 0;
    }
    
    // Fill in actual spending data
    filteredTransactions
      .filter(t => t.transaction_type === 'expense')
      .forEach(t => {
        dailyData[t.transaction_date] = (dailyData[t.transaction_date] || 0) + t.amount;
      });

    return Object.entries(dailyData)
      .map(([date, amount]) => ({
        value: amount,
        label: new Date(date).getDate().toString(),
        date: date,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

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

  const pieData = getPieChartData();
  const barData = getBarChartData();
  const lineData = getLineChartData();

  const totalExpense = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const renderPieChart = () => (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
        Expense Categories
      </Text>
      {pieData.length > 0 ? (
        <View style={styles.pieChartWrapper}>
          <PieChart
            data={pieData}
            donut
            innerRadius={60}
            radius={100}
            centerLabelComponent={() => (
              <View style={styles.pieChartCenter}>
                <Text style={[styles.pieChartCenterText, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  Total
                </Text>
                <Text style={[styles.pieChartCenterAmount, { color: settings.dark_mode ? '#fff' : '#333' }]}>
                  {formatCurrency(totalExpense)}
                </Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="pie-chart-outline" size={48} color="#ccc" />
          <Text style={styles.noDataText}>No expense data available</Text>
        </View>
      )}
    </View>
  );

  const renderBarChart = () => (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
        Monthly Expenses
      </Text>
      {barData.length > 0 ? (
        <View style={styles.barChartWrapper}>
          <BarChart
            data={barData}
            width={width - 80}
            height={200}
            barBorderRadius={4}
            frontColor="#FF6B6B"
            yAxisThickness={1}
            xAxisThickness={1}
            yAxisColor={settings.dark_mode ? '#666' : '#ccc'}
            xAxisColor={settings.dark_mode ? '#666' : '#ccc'}
            yAxisTextStyle={{ color: settings.dark_mode ? '#ccc' : '#666' }}
            xAxisLabelTextStyle={{ color: settings.dark_mode ? '#ccc' : '#666' }}
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
          <Text style={styles.noDataText}>No monthly data available</Text>
        </View>
      )}
    </View>
  );

  const renderLineChart = () => (
    <View style={styles.chartContainer}>
      <Text style={[styles.chartTitle, { color: settings.dark_mode ? '#fff' : '#333' }]}>
        Daily Spending Trend
      </Text>
      {lineData.length > 0 ? (
        <View style={styles.lineChartWrapper}>
          <LineChart
            data={lineData}
            width={width - 80}
            height={200}
            color="#FF6B6B"
            thickness={3}
            dataPointsColor="#FF6B6B"
            dataPointsRadius={4}
            yAxisColor={settings.dark_mode ? '#666' : '#ccc'}
            xAxisColor={settings.dark_mode ? '#666' : '#ccc'}
            yAxisTextStyle={{ color: settings.dark_mode ? '#ccc' : '#666' }}
            xAxisLabelTextStyle={{ color: settings.dark_mode ? '#ccc' : '#666' }}
            curved
            areaChart
            startFillColor="#FF6B6B"
            startOpacity={0.3}
            endOpacity={0.1}
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="trending-up-outline" size={48} color="#ccc" />
          <Text style={styles.noDataText}>No daily data available</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: settings.dark_mode ? '#121212' : '#f8f9fa' }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.header}>
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

          {/* Summary Stats */}
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                Total Income
              </Text>
              <Text style={[styles.statValue, { color: '#4ECDC4' }]}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                Total Expenses
              </Text>
              <Text style={[styles.statValue, { color: '#FF6B6B' }]}>
                {formatCurrency(totalExpense)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: settings.dark_mode ? '#ccc' : '#666' }]}>
                Net Amount
              </Text>
              <Text style={[
                styles.statValue, 
                { color: totalIncome - totalExpense >= 0 ? '#4ECDC4' : '#FF6B6B' }
              ]}>
                {formatCurrency(totalIncome - totalExpense)}
              </Text>
            </View>
          </View>
        </View>

        {/* Chart Type Selector */}
        <View style={styles.chartSelector}>
          <TouchableOpacity
            style={[
              styles.chartButton,
              selectedChart === 'pie' && styles.chartButtonActive,
              { backgroundColor: selectedChart === 'pie' ? '#FF6B6B' : (settings.dark_mode ? '#1e1e1e' : '#fff') }
            ]}
            onPress={() => setSelectedChart('pie')}
          >
            <Ionicons 
              name="pie-chart" 
              size={20} 
              color={selectedChart === 'pie' ? '#fff' : (settings.dark_mode ? '#fff' : '#333')} 
            />
            <Text style={[
              styles.chartButtonText,
              { color: selectedChart === 'pie' ? '#fff' : (settings.dark_mode ? '#fff' : '#333') }
            ]}>
              Categories
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.chartButton,
              selectedChart === 'bar' && styles.chartButtonActive,
              { backgroundColor: selectedChart === 'bar' ? '#FF6B6B' : (settings.dark_mode ? '#1e1e1e' : '#fff') }
            ]}
            onPress={() => setSelectedChart('bar')}
          >
            <Ionicons 
              name="bar-chart" 
              size={20} 
              color={selectedChart === 'bar' ? '#fff' : (settings.dark_mode ? '#fff' : '#333')} 
            />
            <Text style={[
              styles.chartButtonText,
              { color: selectedChart === 'bar' ? '#fff' : (settings.dark_mode ? '#fff' : '#333') }
            ]}>
              Monthly
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.chartButton,
              selectedChart === 'line' && styles.chartButtonActive,
              { backgroundColor: selectedChart === 'line' ? '#FF6B6B' : (settings.dark_mode ? '#1e1e1e' : '#fff') }
            ]}
            onPress={() => setSelectedChart('line')}
          >
            <Ionicons 
              name="trending-up" 
              size={20} 
              color={selectedChart === 'line' ? '#fff' : (settings.dark_mode ? '#fff' : '#333')} 
            />
            <Text style={[
              styles.chartButtonText,
              { color: selectedChart === 'line' ? '#fff' : (settings.dark_mode ? '#fff' : '#333') }
            ]}>
              Trend
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart Display */}
        {selectedChart === 'pie' && renderPieChart()}
        {selectedChart === 'bar' && renderBarChart()}
        {selectedChart === 'line' && renderLineChart()}

        {/* Bottom spacing */}
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
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  chartSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  chartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  chartButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  chartContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  pieChartWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pieChartCenter: {
    alignItems: 'center',
  },
  pieChartCenterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pieChartCenterAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  barChartWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  lineChartWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 12,
  },
  bottomSpacing: {
    height: 20,
  },
});