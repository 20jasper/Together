/// <reference types="cypress" />

import {
  createOffsetDate,
  dateToHHMM,
  dateToYYYYMMDD,
  ensureInMiddleOfMonthAndDay,
} from "../support/functions";
import tgt from "../support/tgt";

describe("Event Creation Form", () => {
  const dayCheckboxesExist = should => {
    for (const day of [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]) {
      cy.get(`input[name="${day}"]`).should(
        `${should ? "" : "not."}be.visible`
      );
    }
  };

  const expectFormErrors = (...expectingErrors) => {
    if (!expectingErrors.length) {
      return tgt.createForm.alerts().should("not.exist");
    }

    tgt.createForm
      .alerts()
      .each($alert => {
        const text = $alert.text().split("Error: ")[1];
        expect(expectingErrors).to.include(text);
        expectingErrors.splice(expectingErrors.indexOf(text), 1);
      })
      .then(() => expect(expectingErrors).to.have.length(0));
  };

  const fillOutFirstPage = () => {
    tgt.createForm.button.next().click();
    expectFormErrors(
      "title field can't be empty",
      "description field can't be empty",
      "location field can't be empty"
    );

    tgt.createForm.input.title().type("Test Title");
    tgt.createForm.input.description().type("Test Description");
    tgt.createForm.button.next().click();
    expectFormErrors("location field can't be empty");

    tgt.createForm.input.location().type("Test Location");

    cy.get('input[name="discordName"]')
      .should("have.value", "100Dever#0001")
      .should("be.disabled");
    cy.contains("button", "Back").then($button =>
      expect($button.css("cursor")).to.equal("not-allowed")
    );
    tgt.createForm.button.next().click();
    cy.contains("button", "Back").click();
    tgt.createForm.input.title().should("exist");
    tgt.createForm.button.next().click();
    expectFormErrors();
  };

  const submitAndAssertRequest = (
    startDate,
    startTime,
    endDate,
    endTime,
    recurring
  ) => {
    for (const string of [
      "Test Title",
      "Test Description",
      "Test Location",
      "100Dever#0001",
      startDate,
      startTime,
      endDate,
      endTime,
    ]) {
      tgt.createForm.get(0).contains(string);
    }

    cy.intercept("POST", "/events").as("createEvent");

    tgt.createForm.button.submit().click();

    cy.wait("@createEvent", { timeout: 10000 }).then(({ request }) => {
      const body = request.body;

      const firstEventStart = new Date(startDate + "T" + startTime).getTime();
      const firstEventEnd = new Date(startDate + "T" + endTime).getTime();
      const lastEventStart = new Date(endDate + "T" + startTime).getTime();

      expect(body).to.deep.equal({
        title: "Test Title",
        description: "Test Description",
        location: "Test Location",
        discordName: "100Dever#0001",
        firstEventStart,
        firstEventEnd,
        lastEventStart,
        recurring,
      });
    });

    cy.contains("Your Event has been added");
    tgt.createForm.close();
    tgt.createForm.get().should("not.exist");
  };

  it("Single", () => {
    const now = ensureInMiddleOfMonthAndDay();
    cy.visit("/");

    cy.login("100_DEVER", true);
    tgt.calendar.button.addEvent().click();

    fillOutFirstPage();
    tgt.createForm.button.next().click();
    expectFormErrors(
      "Start Date field can't be empty",
      "End Date field can't be empty",
      "Start Time field can't be empty",
      "End Time field can't be empty"
    );

    tgt.createForm.input.noRecurring().should("be.checked");
    dayCheckboxesExist(false);

    const dateString = dateToYYYYMMDD(createOffsetDate(now, "Date", 2));
    const startTimeString = dateToHHMM(now);
    const endTimeString = dateToHHMM(createOffsetDate(now, "Hours", 1));

    tgt.createForm.input.endDate().should("have.value", "");
    tgt.createForm.input.startDate().type(dateString);
    tgt.createForm.input.endDate().should("have.value", dateString);
    tgt.createForm.input.startTime().type(startTimeString);

    tgt.createForm.button.next().click();
    expectFormErrors("End Time field can't be empty");

    tgt.createForm.input.endTime().type(endTimeString);
    tgt.createForm.input
      .endDate()
      .type(dateToYYYYMMDD(createOffsetDate(now, "Date", 1)));
    tgt.createForm.button.next().click();
    expectFormErrors("End time is before Start time");

    tgt.createForm.input
      .endDate()
      .type(dateToYYYYMMDD(createOffsetDate(now, "Date", 100)));
    tgt.createForm.button.next().click();
    expectFormErrors(
      "Start date and End date cannot be more than 90 days apart"
    );

    tgt.createForm.input.endDate().type(dateString);
    tgt.createForm.input
      .endTime()
      .type(dateToHHMM(createOffsetDate(now, "Minutes", -1)));
    tgt.createForm.button.next().click();
    expectFormErrors("End time is before Start time");

    tgt.createForm.input.endTime().type(endTimeString);
    tgt.createForm.button.next().click();
    expectFormErrors();

    submitAndAssertRequest(
      dateString,
      startTimeString,
      dateString,
      endTimeString,
      {
        rate: "noRecurr",
        days: [],
      }
    );

    cy.contains("button", "Test Title");

    tgt.calendar.button.addEvent().click();
    cy.contains("button", "New Event").click();
    tgt.createForm.input.title().should("exist");
  });

  it("Recurring", () => {
    const now = ensureInMiddleOfMonthAndDay();
    cy.visit("/");

    cy.login("100_DEVER", true);
    tgt.calendar.button.addEvent().click();

    fillOutFirstPage();

    tgt.createForm.input.weekly().click();
    dayCheckboxesExist(true);
    tgt.createForm.button.next().click();
    expectFormErrors(
      "Start Date field can't be empty",
      "End Date field can't be empty",
      "Start Time field can't be empty",
      "End Time field can't be empty",
      "Weekly recurring event MUST include at least one day of the week"
    );

    cy.get('input[name="Tuesday"]').click();
    cy.get('input[name="Thursday"]').click();
    tgt.createForm.button.next().click();
    expectFormErrors(
      "Start Date field can't be empty",
      "End Date field can't be empty",
      "Start Time field can't be empty",
      "End Time field can't be empty"
    );

    cy.get('input[name="Wednesday"]').click();
    cy.get('input[name="Wednesday"]').click();
    cy.get('input[name="Wednesday"]').should("not.be.checked");

    const dateString = dateToYYYYMMDD(createOffsetDate(now, "Date", 2));
    const startTimeString = dateToHHMM(now);
    const endDateString = dateToYYYYMMDD(createOffsetDate(now, "Date", 9));
    const endTimeString = dateToHHMM(new Date(now.getTime() + 60 * 60 * 1000));

    tgt.createForm.input.endDate().should("have.value", "");
    tgt.createForm.input.startDate().type(dateString);
    tgt.createForm.input.endDate().should("have.value", "");

    tgt.createForm.input.startTime().type(startTimeString);
    tgt.createForm.input.endDate().type(endDateString);
    tgt.createForm.input.endTime().type(endTimeString);
    tgt.createForm.button.next().click();
    expectFormErrors();

    submitAndAssertRequest(
      dateString,
      startTimeString,
      endDateString,
      endTimeString,
      {
        rate: "weekly",
        days: ["2", "4"],
      }
    );

    cy.get('button:contains("Test Title")').should(
      "have.length.of.at.least",
      2
    );
  });
});
