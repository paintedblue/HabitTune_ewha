import React, { useContext } from 'react'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackNavigationOptions } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HabitScreen from '../screens/HabitScreen';
import LyricQuestionScreen from '../screens/LyricQuestionScreen';
import LyricSelectScreen from '../screens/LyricSelectScreen';
import MelodyScreen from '../screens/MelodyScreen';
import LoadingScreen from '../screens/LoadingScreen';
import PlayScreen from '../screens/PlayScreen';
import SongListScreen from '../screens/SongListScreen';
import LyricMakeScreen from '../screens/LyricMakeScreen';
import LyricResultScreen from '../screens/LyricResultScreen';
import SongInstrumentScreen from '../screens/SongInstrumentScreen';
import SongRhythmScreen from '../screens/SongRhythmScreen';
import SongMoodScreen from '../screens/SongMoodScreen';
import HabitQuestionScreen from '../screens/HabitQuestionScreen';
import { SelectedCategoriesContext } from '../contexts/SelectedCategoriesContext';

export declare module CommonType {
    /** 
     * StackNavigation 관리하는 화면들
    */
    export type RootStackPageList = {
        
    };
}

/** 
 * StackNavigator를 이용하여서 앱에 대한 페이지 이동을 관리합니다.
*/
const StackNavigation = () => {
    const { isAuthenticated, authState } = useContext(SelectedCategoriesContext);

    // RootStackPageList에서 페이지를 관리합니다
    const Stack = createStackNavigator<CommonType.RootStackPageList>();

    const customStackNavigationOptions: StackNavigationOptions = {
        gestureEnabled: false,
        title: '',
        headerShown: false,
    }

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName={"HomeScreen"} screenOptions={customStackNavigationOptions}>
                <Stack.Screen name="LoginScreen">
                    {(props) => <LoginScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="RegisterScreen">
                    {(props) => <RegisterScreen {...props} />}
                </Stack.Screen>
                {/* 메인 페이지 */}
                <Stack.Screen name="HomeScreen">
                    {(props) => <HomeScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="HabitScreen">
                    {(props) => <HabitScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="HabitQuestionScreen">
                    {(props) => <HabitQuestionScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="LyricSelectScreen">
                    {(props) => <LyricSelectScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="LyricQuestionScreen">
                    {(props) => <LyricQuestionScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="MelodyScreen">
                    {(props) => <MelodyScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="LoadingScreen">
                    {(props) => <LoadingScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="PlayScreen">
                    {(props) => <PlayScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="SongListScreen">
                    {(props) => <SongListScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="LyricMakeScreen">
                    {(props) => <LyricMakeScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="LyricResultScreen">
                    {(props) => <LyricResultScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="SongInstrumentScreen">
                    {(props) => <SongInstrumentScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="SongRhythmScreen">
                    {(props) => <SongRhythmScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="SongMoodScreen">
                    {(props) => <SongMoodScreen {...props} />}
                </Stack.Screen>
            </Stack.Navigator>
        </NavigationContainer >
    )

}
export default StackNavigation;
