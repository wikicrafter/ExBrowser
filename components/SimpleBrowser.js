// components/SimpleBrowser.js
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

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

const SimpleBrowser = () => {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: 'https://www.youtube.com' }}
        injectedJavaScript={adBlockingScript + trackingBlockingScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SimpleBrowser;
