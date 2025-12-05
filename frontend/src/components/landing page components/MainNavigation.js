import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; 

const NavItem = ({ iconName, label, isFocused }) => (
  <TouchableOpacity style={styles.navItem}>
    <Icon name={iconName} size={24} color={isFocused ? '#9370DB' : '#A9A9A9'} />
    <Text style={[styles.navLabel, { color: isFocused ? '#9370DB' : '#A9A9A9' }]}>{label}</Text>
  </TouchableOpacity>
);

const MainNavigation = () => (
  <View style={styles.navigation}>
    <NavItem iconName="home-outline" label="Home" isFocused={true} />
    <NavItem iconName="bag-outline" label="Shop" />
    <NavItem iconName="heart-outline" label="Favorites" />
    <NavItem iconName="person-outline" label="Profile" />
    {/* The cart/bag icon is sometimes in the center, or last */}
  </View>
);

const styles = StyleSheet.create({
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
// export default MainNavigation;