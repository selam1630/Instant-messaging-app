// For PNG files
declare module "*.png" {
  const value: string;
  export default value;
}

// For react-native-audio-recorder-player
declare module 'react-native-audio-recorder-player' {
  interface StartRecordResult {
    result: string;
  }

  interface StopRecordResult {
    result: string;
  }

  class AudioRecorderPlayer {
    startRecorder(path?: string): Promise<StartRecordResult>;
    stopRecorder(): Promise<StopRecordResult>;
    startPlayer(path: string): Promise<string>;
    stopPlayer(): Promise<void>;
    addRecordBackListener(listener: (e: { current_position: number }) => void): void;
    removeRecordBackListener(): void;
    addPlayBackListener(listener: (e: { current_position: number; duration: number }) => void): void;
    removePlayBackListener(): void;
  }

  const audioRecorderPlayer: AudioRecorderPlayer;
  export default audioRecorderPlayer;
}
