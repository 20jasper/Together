import { useState } from "react";
import DataService from "services/dataService";
import { dateToTimestamp } from "utilities/calendar";
import { useEventsContext } from "contexts/EventsContext";

const useProvideForm = () => {
  const { addEvents } = useEventsContext();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = ["Description", "Schedule", "Confirm", "Success"];

  const [formData, setFormData] = useState({
    recurring: { rate: "noRecurr", days: [] },
  });

  // form errors
  const [formCreateEventErrors, setFormCreateEventErrors] = useState([]);
  const [formScheduleEventErrors, setFormScheduleEventErrors] = useState([]);

  const handleNewStep = async direction => {
    const newStep = direction === "next" ? currentStep + 1 : currentStep - 1;

    if (newStep > 0 && newStep <= totalSteps.length) {
      setCurrentStep(newStep);
    }

    // Submit form to server
    if (newStep === 4) {
      const { initialDate, startTime, finalDate, endTime, ...rest } = formData;
      // start and end timestamps of the earliest possible event
      const firstEventStart = dateToTimestamp(initialDate, startTime);
      const firstEventEnd = dateToTimestamp(initialDate, endTime);
      // start timestamp of the last possible event
      const lastEventStart = dateToTimestamp(finalDate, startTime);

      const recurrOffset =
        new Date(firstEventStart).getUTCDay() -
        new Date(firstEventStart).getDay();
      // console.log(`recurrOffset: ${recurrOffset}`);

      const { days } = formData.recurring;
      const daysWithOffset = days.map(e =>
        String((Number(e) + recurrOffset + 7) % 7)
      );

      // console.log(formData.recurring.days);
      formData.recurring.days = daysWithOffset;
      // console.log(formData.recurring.days);

      // Event data to be sent to the backend
      const event = { ...rest, firstEventStart, firstEventEnd, lastEventStart };

      let response;
      try {
        // Axios automatically serializes object to JSON
        // https://masteringjs.io/tutorials/axios/post-json
        response = await DataService.create(event);
      } catch (err) {
        console.error(err);
        return;
      }

      const events = response.data.events;
      addEvents(events);
    }
  };

  return {
    currentStep,
    totalSteps,
    formData,
    formCreateEventErrors,
    formScheduleEventErrors,
    handleNewStep,
    setFormData,
    setFormCreateEventErrors,
    setFormScheduleEventErrors,
    setCurrentStep
  };
};

export default useProvideForm;
