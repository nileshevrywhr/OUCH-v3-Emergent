import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the home tab
  return <Redirect href="/(tabs)/home" />;
}