// document.addEventListener("DOMContentLoaded", function() {
//     // Select the body element
//     var sectionElements = document.getElementsByTagName("section");
//     // Convert HTMLCollection to an array
//     var sectionArray = Array.from(sectionElements);
//     // Add an event listener to each section element to trigger fullscreen
//     sectionArray.forEach(element => element.addEventListener("click", function() {
//         var element = document.documentElement;
//         if (element.requestFullscreen) {
//           element.requestFullscreen();
//         } else if (element.mozRequestFullScreen) { /* Firefox */
//           element.mozRequestFullScreen();
//         } else if (element.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
//           element.webkitRequestFullscreen();
//         } else if (element.msRequestFullscreen) { /* IE/Edge */
//           element.msRequestFullscreen();
//         }
//     }));
// });
