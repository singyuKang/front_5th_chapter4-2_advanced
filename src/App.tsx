import { ChakraProvider } from "@chakra-ui/react";
import { ScheduleProvider } from "./contexts/ScheduleContext.tsx";
import ScheduleDndProvider from "./contexts/ScheduleDndProvider.tsx";
import SchedulePage from "./pages/SchedulePage.tsx";

function App() {
  return (
    <ChakraProvider>
      <ScheduleProvider>
        <ScheduleDndProvider>
          <SchedulePage />
        </ScheduleDndProvider>
      </ScheduleProvider>
    </ChakraProvider>
  );
}

export default App;
