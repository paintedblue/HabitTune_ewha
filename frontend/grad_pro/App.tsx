import React, { useEffect } from 'react';
import StackNavigation from './src/navigation/StackNavigation';
import { SelectedCategoriesProvider } from './src/contexts/SelectedCategoriesContext';

/**
 * Main App
 * @param props 
 * @returns 
 */
const App = (props: any) => {
  return (
    <SelectedCategoriesProvider>
    <StackNavigation />
    </SelectedCategoriesProvider>
  )
}
export default App;