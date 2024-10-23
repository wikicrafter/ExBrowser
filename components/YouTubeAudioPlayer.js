// components/YouTubeAudioPlayer.js
import React, { useState, useEffect } from 'react';
import { View, Button } from 'react-native';
import { Audio } from 'expo-av';

const YouTubeAudioPlayer = () => {
  const [sound, setSound] = useState();

  async function playAudio() {
    const { sound } = await Audio.Sound.createAsync(
       { uri: 'https://www.example.com/audio.mp3' } // Replace with a valid audio URL
    );
    setSound(sound);
    await sound.playAsync();
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync(); // Unload sound when component unmounts
        }
      : undefined;
  }, [sound]);

  return (
    <View>
      <Button title="Play Audio" onPress={playAudio} />
    </View>
  );
};

export default YouTubeAudioPlayer;
