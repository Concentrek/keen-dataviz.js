export default function (startDate, endDate) {
  const timeDiff = Math.abs(new Date(startDate).getTime() - new Date(endDate).getTime());
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'June',
    'July',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec'
  ];

  // Yearly (31536000000) + Monthly
  if (timeDiff >= 2419200000) {
    return function(ms){
      const date = new Date(ms);
      return months[date.getMonth()] + ' ' + date.getFullYear();
    };
  }
  // Daily
  else if (timeDiff >= 86400000) {
    return function(ms){
      const date = new Date(ms);
      return months[date.getMonth()] + ' ' + date.getDate();
    };
  }
  // Hourly
  else if (timeDiff >= 3600000) {
    return '%I:%M %p';
  }
  // Minutely
  else {
    return '%I:%M:%S %p';
  }
}
