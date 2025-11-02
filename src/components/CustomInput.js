import React from 'react';
import { TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './CustomInput.styles';

export default function CustomInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  onIconPress,
  rightIconName,
  autoCapitalize='none',
  autoCorrect=false,
  ...rest
}) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        {...rest}
      />
      {rightIconName ? (
        <Ionicons
          name={rightIconName}
          size={28}
          style={styles.icon}
          onPress={onIconPress}
        />
      ) : null}
    </View>
  );
}
