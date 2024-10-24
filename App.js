import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Switch, Button, TextInput, FlatList, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { WebView } from 'react-native-webview';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, Appbar, DefaultTheme, DarkTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Import icon library

// Create Stack Navigator
const Stack = createStackNavigator();

// Light and Dark themes from React Native Paper
const lightGradient = ['#FFDEE9', '#B5FFFC'];
const darkGradient = ['#2C3E50', '#4CA1AF'];

const MAX_TABS = 7; // Max number of allowed tabs

// Function to ensure the URL has a valid protocol
const formatUrl = (inputUrl) => {
  if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
    return `https://${inputUrl}`;
  }
  return inputUrl;
};

// Tab Navigation Component (Top Tabs)
const TopTabNavigator = ({ tabs, activeTabIndex, switchTab, closeTab }) => {
  return (
    <View style={styles.topTabContainer}>
      <FlatList
        horizontal
        data={tabs}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => switchTab(index)}
            style={[styles.tab, activeTabIndex === index && styles.activeTab]}
          >
            <Text style={styles.tabText}>{`Tab ${index + 1}`}</Text>
            <TouchableOpacity onPress={() => closeTab(index)}>
              <Text style={styles.closeTab}>X</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// Browser Screen with Pull-to-Refresh and WebView Reload
const BrowserScreen = ({ navigation, route }) => {
  const [tabs, setTabs] = useState([{ url: 'https://www.google.com' }]); // Default with one tab
  const [activeTabIndex, setActiveTabIndex] = useState(0); // Track the current active tab
  const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [showUrlBar, setShowUrlBar] = useState(false); // State to control URL Bar visibility
  const [refreshing, setRefreshing] = useState(false); // State to manage refresh control
  const webViewRef = useRef(null);

  const { isAdBlockingEnabled, isTrackingBlockingEnabled, isDarkMode, useAdGuardDNS } = route.params || {
    isAdBlockingEnabled: false,
    isTrackingBlockingEnabled: false,
    isDarkMode: false,
    useAdGuardDNS: false, // Default to not using AdGuard DNS
  };

  // Ad and Tracker Blocking JavaScript
  const adBlockingScript = `
    (function() {
      const adSelectors = ['.adsbygoogle', '#ad', '.ad-banner', 'iframe[src*="ads"]'];
      adSelectors.forEach(selector => {
        const ads = document.querySelectorAll(selector);
        ads.forEach(ad => ad.remove());
      });
    })();
  `;
  
  const trackingBlockingScript = `
    (function() {
      const trackers = ['google-analytics.com', 'facebook.com', 'doubleclick.net'];
      trackers.forEach(tracker => {
        const scripts = document.querySelectorAll('script[src*="' + tracker + '"]');
        scripts.forEach(script => script.remove());
      });
    })();
  `;

  // Inject AdGuard DNS or Default DNS script based on user choice
  const dnsScript = useAdGuardDNS
    ? `fetch('https://94.140.14.14').catch(() => {});`  // AdGuard DNS
    : ''; // Default DNS (no DNS script needed)

  // Inject JS based on user settings
  const injectedJS = `
    ${isAdBlockingEnabled ? adBlockingScript : ''}
    ${isTrackingBlockingEnabled ? trackingBlockingScript : ''}
    ${dnsScript}
  `;

  // Handle URL input and navigation
  const handleGo = () => {
    const formattedUrl = formatUrl(tabs[activeTabIndex].url);
    updateTabUrl(activeTabIndex, formattedUrl);
  };

  // Update URL in the current tab
  const updateTabUrl = (tabIndex, url) => {
    const newTabs = [...tabs];
    newTabs[tabIndex].url = url;
    setTabs(newTabs);
    setCurrentUrl(url);
  };

  // Add a new tab (if less than MAX_TABS)
  const addNewTab = () => {
    if (tabs.length >= MAX_TABS) {
      Alert.alert('Limit Reached', `You can't open more than ${MAX_TABS} tabs.`);
      return;
    }
    setTabs([...tabs, { url: 'https://www.google.com' }]);
    setActiveTabIndex(tabs.length); // Switch to the new tab
    setCurrentUrl('https://www.google.com');
  };

  // Switch between tabs
  const switchTab = (index) => {
    setActiveTabIndex(index);
    setCurrentUrl(tabs[index].url);
  };

  // Close a tab
  const closeTab = (index) => {
    if (tabs.length === 1) {
      Alert.alert('Warning', 'You need to have at least one tab open.');
      return;
    }

    const newTabs = tabs.filter((_, i) => i !== index);
    setTabs(newTabs);
    
    if (index === activeTabIndex && index > 0) {
      setActiveTabIndex(index - 1); // Go to the previous tab
    } else if (index === activeTabIndex && index === 0) {
      setActiveTabIndex(0); // Stay on the first tab
    } else if (index < activeTabIndex) {
      setActiveTabIndex(activeTabIndex - 1); // Adjust active tab if necessary
    }

    setCurrentUrl(newTabs[Math.max(0, activeTabIndex - 1)]?.url || 'https://www.google.com');
  };

  // Handle swipe gestures
  const onSwipeGesture = (event) => {
    const { translationX } = event.nativeEvent;

    if (translationX < -50 && canGoBack) {
      webViewRef.current.goBack(); // Swipe left to go back
    } else if (translationX > 50 && canGoForward) {
      webViewRef.current.goForward(); // Swipe right to go forward
    }
  };

  // Pull-to-Refresh feature
  const onRefresh = () => {
    setRefreshing(true);
    webViewRef.current.reload(); // Reload the current WebView page
    setTimeout(() => setRefreshing(false), 1000); // Simulate a refresh delay
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler onGestureEvent={onSwipeGesture}>
        <View style={styles.container}>
          <TopTabNavigator
            tabs={tabs}
            activeTabIndex={activeTabIndex}
            switchTab={switchTab}
            closeTab={closeTab}
          />

          {/* WebView Section with Pull-to-Refresh */}
          <WebView
            ref={webViewRef}
            key={activeTabIndex} // Re-render when switching tabs
            source={{ uri: currentUrl }}
            injectedJavaScript={injectedJS}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={styles.webview}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              setCanGoForward(navState.canGoForward);
            }}
            pullToRefreshEnabled={true} // Enables pull-to-refresh on Android WebView
            onRefresh={onRefresh}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} // Ensure refreshControl is used
          />

          {/* URL Bar Section Moved to the Bottom (Visibility controlled by focus) */}
          {showUrlBar && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.bottomSection}
              keyboardVerticalOffset={90} // Important for iOS to push the content above the keyboard
            >
              <View style={styles.urlBar}>
                <TextInput
                  style={styles.urlInput}
                  value={tabs[activeTabIndex].url}
                  onChangeText={(text) => updateTabUrl(activeTabIndex, text)}
                  placeholder="Enter URL"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                <Button title="Go" onPress={handleGo} />
              </View>
            </KeyboardAvoidingView>
          )}

          {/* Buttons for New Tab, Settings, and Toggle URL Bar */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => setShowUrlBar(!showUrlBar)} style={styles.iconButton}>
              <Icon name={showUrlBar ? 'keyboard-arrow-down' : 'keyboard-arrow-up'} size={30} color="#6200ea" />
            </TouchableOpacity>

            <TouchableOpacity onPress={addNewTab} style={styles.button}>
              <Icon name="add" size={30} color="#fff" />
              {/*<Text style={styles.buttonText}>New Tab</Text>*/}
            </TouchableOpacity>

            

            <TouchableOpacity onPress={() => navigation.navigate('Settings', { isAdBlockingEnabled, isTrackingBlockingEnabled, isDarkMode, useAdGuardDNS })} style={styles.button}>
              <Icon name="settings" size={30} color="#fff" />
              {/*<Text style={styles.buttonText}>Settings</Text>*/}

            </TouchableOpacity>
          </View>
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

// Settings Screen (restored to the working version)
const SettingsScreen = ({ navigation, route }) => {
  const [isAdBlockingEnabled, setAdBlockingEnabled] = useState(route.params?.isAdBlockingEnabled || false);
  const [isTrackingBlockingEnabled, setTrackingBlockingEnabled] = useState(route.params?.isTrackingBlockingEnabled || false);
  const [isDarkMode, setIsDarkMode] = useState(route.params?.isDarkMode || false);
  const [useAdGuardDNS, setUseAdGuardDNS] = useState(route.params?.useAdGuardDNS || false); // New state for DNS choice

  const handleSave = () => {
    navigation.navigate('Browser', { isAdBlockingEnabled, isTrackingBlockingEnabled, isDarkMode, useAdGuardDNS });
  };

  return (
    <LinearGradient
      colors={isDarkMode ? darkGradient : lightGradient}
      style={styles.gradientContainer}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <View style={styles.settingOption}>
        <Text>Block Ads</Text>
        <Switch value={isAdBlockingEnabled} onValueChange={setAdBlockingEnabled} />
      </View>

      <View style={styles.settingOption}>
        <Text>Block Trackers</Text>
        <Switch value={isTrackingBlockingEnabled} onValueChange={setTrackingBlockingEnabled} />
      </View>

      <View style={styles.settingOption}>
        <Text>Dark Mode</Text>
        <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
      </View>

      <View style={styles.settingOption}>
        <Text>Use AdGuard DNS</Text>
        <Switch value={useAdGuardDNS} onValueChange={setUseAdGuardDNS} />
      </View>

      <Button title="Save" onPress={handleSave} />
    </LinearGradient>
  );
};

// Main App
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <PaperProvider theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Browser">
          <Stack.Screen name="Browser" component={BrowserScreen} initialParams={{ isAdBlockingEnabled: false, isTrackingBlockingEnabled: false, isDarkMode }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  urlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  urlInput: {
    flex: 1,
    marginRight: 10,
  },
  webview: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  iconButton: {
    padding: 10,
  },
  button: {
    backgroundColor: '#6200ea',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 5,
  },
  settingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  gradientContainer: {
    flex: 1,
  },
  topTabContainer: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: '#f1f1f1',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 5,
    backgroundColor: '#ddd',
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6200ea',
  },
  tabText: {
    color: '#fff',
    marginRight: 10,
  },
  closeTab: {
    color: '#fff',
  },
});
