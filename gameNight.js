var violet = require('violet').script();
///////////////////////////////////
// Integration and Business Logic
///////////////////////////////////
// Setup Store
var violetStoreSF = require('violet/lib/violetStoreSF')(violet);
// Utilities
var monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
var weekDays = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}
var getDay = (dateTime)=>{
  return `${dateTime.getDate()} ${monthNames[dateTime.getMonth()]}`;
};
var getTime = (dateTime)=>{
  var hh = dateTime.getHours();
  var mm = dateTime.getMinutes();
  var ampm = 'am';
  if (hh>12) {
    hh-=12;
    ampm = 'pm';
  }
  if (mm==0) {
    mm = '';
  } else if (mm<10) {
    mm = 'Oh ' + mm; // Zero is pronounced as Oh when saying the time
  }
  return `${hh} ${mm} ${ampm}`;
};
var calcDateInFuture = (dayOfWeekStr, timeInPMStr)=>{
  var dt = new Date();
  var dayOfWeek = weekDays[dayOfWeekStr.toLowerCase()]
  if (dayOfWeek < dt.getDay()) dayOfWeek += 7;
  dt.setDate(dt.getDate() + dayOfWeek - dt.getDay());
  dt.setHours(parseInt(timeInPMStr) + 12);
  dt.setMinutes(0);
  dt.setSeconds(0);
  dt.setMilliseconds(0);
  return dt;
};
// Hook up the Script
var app = {
  getPastGameNights: (response)=>{
    return response.load({
      query: 'Id, Duration__c, Food__c, Game__c, Name, Start_Time__c FROM Game_Night__c WHERE Start_Time__c < TODAY'
    }).then((results)=>{
      if (results.length == 0) {
        response.say(`Sorry, I did not have anything scheduled`);
      } else {
        var dt = new Date(results[0].get('start_time__c'));
        response.say(`I had a game night scheduled on ${getDay(dt)} at ${getTime(dt)} where ${results[0].get('game__c')} was played`);
      }
    });
  },
  getUpcomingGameNights: (response)=>{
    return response.load({
      query: 'Id, Duration__c, Food__c, Game__c, Name, Start_Time__c FROM Game_Night__c WHERE Start_Time__c >= TODAY'
    }).then((results)=>{
      if (results.length == 0) {
        response.say(`Sorry, I do not have anything scheduled`);
      } else {
        var dt = new Date(results[0].get('start_time__c'));
        response.say(`I have a game night scheduled on ${getDay(dt)} at ${getTime(dt)} to play ${results[0].get('game__c')}`);
      }
    });
  },
  createGameNight: (response)=>{
    var dt = calcDateInFuture(response.get('day'), response.get('time'));
    return response.store('Game_night', {
      'name*': 'Game Night created by Violet',
      start_time: dt,
      duration: parseInt(response.get('duration')),
      game: response.get('game'),
      food: response.get('food')
    });
  }
}
///////////////////////////////////
// The Voice Script
///////////////////////////////////
violet.addInputTypes({
  "day": {
    type: "dayType",
    values: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  },
  "time": "number",
  "duration": "number",
  "game": "phrase",
  "food": "phrase",
});
violet.addFlowScript(`
<app>
  <choice id="launch">
    <expecting>What can you do</expecting>
    <say>I can help you with planning Game Nights</say>
  </choice>
  <choice id="list">
    <expecting>What game nights have already been planned</expecting>
    <say>Sure</say>
    <decision>
      <prompt>Would you like to hear of game nights that are upcoming or in the past</prompt>
      <choice>
        <expecting>{In the|} past</expecting>
        <resolve value="app.getPastGameNights(response)"/>
      </choice>
      <choice>
        <expecting>Upcoming</expecting>
        <resolve value="app.getUpcomingGameNights(response)"/>
      </choice>
    </decision>
  </choice>
  <dialog id="create" elicit="dialog.nextReqdParam()">
    <expecting>I'm looking to organize a game night {this [[day]]|}</expecting>
    <item name="day" required>
      <ask>What day would you like it to be on?</ask>
      <expecting>{I'd like it to be]} this [[day]]</expecting>
    </item>
    <item name="duration" required>
      <ask>How long would you like it to be?</ask>
      <expecting>[[duration]] hours</expecting>
    </item>
    <item name="game" required>
      <ask>What would you like the main game to be</ask>
      <expecting>[[game]]</expecting>
    </item>
    <item name="food" required>
      <ask>Do you want snacks, lunch or dinner?</ask>
      <expecting>{everyone wants|} [[food]]</expecting>
    </item>
    <resolve value="app.createGameNight(response)">
      <say>Great, you are all set</say>
    </resolve>
  </dialog>
  <choice id="update">
    <expecting>Update</expecting>
    <expecting>Delete</expecting>
    <say>...</say>
  </choice>
</app>`, {app});
