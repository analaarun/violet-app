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
  getUserDetails: (response)=>{
    return response.load({
      query: `Id, lastname, firstname FROM Contact WHERE lastname = '${response.get('lastname')}'`
    }).then((results)=>{
      if (results.length == 0) {
        response.say(`Sorry, I am not able to authenticate at this point of time.`);
      } else {
        response.say(`Hello ${results[0].get('firstname')} ${results[0].get('lastname')}. I can see your account num ABC123 got suspended because your payment was not successful due to credit card expiry.`);
      }
    });
  },
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
    <say>I can help you with Account Suspension troubleshooting.</say>
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
  <dialog id="ques1" elicit="dialog.nextReqdParam()">
    <expecting>I am not able to login salesforce.</expecting>
    <say>Sorry for the inconvenience. Let me check this for you.</say>
    <item name="lastname" required>
      <ask>What is your last name?</ask>
      <expecting>{My Last Name is} [[lastname]]</expecting>
    </item>
    <item name="dob" required>
      <ask>please confirm you date of birth in MMDDYYYY format. For example your date of birth is 3rd February 2000 then say 03022000</ask>
      <expecting>{My date of birth is} [[dob]]</expecting>
    </item>
    <resolve value="app.getUserDetails(response)">
    </resolve>
  </dialog>
  <dialog id="suggest1" elicit="dialog.nextReqdParam()">
    <expecting>can you suggest an alternative way to make payment?</expecting>
    <say>I have the following options for you.</say>
    <say>you can call out service agent and make the payment or you can make a wire transfer.</say>
  </dialog>
  <dialog id="askWire" elicit="dialog.nextReqdParam()">
    <expecting>Can you share the details of wire transfer?</expecting>
    <say>Sure let me send you the email with invoice that contain the details.</say>
  </dialog>
  <dialog id="create" elicit="dialog.nextReqdParam()">
    <expecting>I'm looking to organize a game night {this [[day]]|}</expecting>
    <item name="day" required>
      <ask>What day would you like it to be on?</ask>
      <expecting>{I'd like it to be} this [[day]]</expecting>
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
  <dialog id="fetch" elicit="dialog.nextReqdParam()">
    <expecting>I want to know why my account suspended.</expecting>
    <item name="lastname" required>
      <ask>What is your last name?</ask>
      <expecting>{My Last Name is} [[lastname]]</expecting>
    </item>
    <resolve value="app.getUserDetails(response)">
    <say>Great, you are all set</say>
    </resolve>
  </dialog>
  <choice id="update">
    <expecting>Update</expecting>
    <expecting>Delete</expecting>
    <say>...</say>
  </choice>
</app>`, {app});
