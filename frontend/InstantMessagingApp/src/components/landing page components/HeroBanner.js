import React from 'react';
import { View, ImageBackground, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const HeroBanner = () => (
  <ImageBackground 
    source={/* Your main fashion sale image here */}
    style={styles.banner}
    imageStyle={styles.imageStyle}
  >
    <View style={styles.textContainer}>
      <Text style={styles.title}>Fashion sale</Text>
      <Text style={styles.subtitle}>SHOP NOW</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>SHOP NOW</Text>
      </TouchableOpacity>
    </View>
  </ImageBackground>
);

const styles = StyleSheet.create({
  banner: {
    height: width * 1.2, // Adjust height based on your image aspect ratio
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden', // Important for borderRadius to work on the image
    justifyContent: 'flex-end', // Align content to the bottom
  },
  textContainer: {
    padding: 20,
    // Add a subtle gradient or transparent background if needed
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff', // White text
    // Add custom font here
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 10,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Black with opacity
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start', // Only take up necessary width
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  }
});
// export default HeroBanner;