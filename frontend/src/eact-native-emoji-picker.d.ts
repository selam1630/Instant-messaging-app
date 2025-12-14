declare module 'react-native-emoji-picker' {
  import { ComponentType } from 'react';
  interface EmojiPickerProps {
    onEmojiSelected: (emoji: { char: string; name?: string }) => void;
    columns?: number;
    emojiSize?: number;
    // Add more props if needed
  }
  const EmojiPicker: ComponentType<EmojiPickerProps>;
  export default EmojiPicker;
}
