# Business Flow

<!-- Explain the business flow here. I'll read this and ask clarifying questions as needed. -->

this project is an internal tool for a firtality test lab anmed as seragen. 

in this process, there are several roles involved. 

1. admin, 
2. manager,
3. customer success, 
4. field executive, 
5. backoffice officer,
6. scientist.

1. now when a new enquery comes in, it is majorly through the whatsapp, then the customer success officer will create a new ticket by adding all the required fields in the form. 

2. after the ticket is created by the customer success officer, the manager or the admin will assign that ticket for sample pickup to the field executive. 

3. once the ticket is assigned to the field executive the field executive will go the required location that is hospital or the patients home for sample pickup as mentioned in the ticket. 

4. after the sample is collected by the field executivve the field executie will update teh ticket status to sample collected and will upload the required documents and images as required. 

5. now the ticket will be assigned to the backoffice officer, the backoffice team will then mark as sample recieved when the get that courier sample physically in thei office they will update the ticket as sample recieved, then the backoffice officer will add a 'Lable code' to these samples and then send it to the labs for the testing and recieveing reports. then after the backoffice officer recievs the raw report from the labs where the sample was sent they will upload it and then marked the ticket as report chnage the stayus. 

6. hen once the report is uploaded the ticket will be assigned to the scientist who will then download the raw report and will generate a final report and upload it there. 

7. after the final report is generated this final report will be displayed on the ticket details page,(everthing until now was also getting displayedd ont he ticket details page) 

8. after the final report is sent to the customer by the customer success officer/manager/admin the ticket will be closed.



# Changes needs to be done

now in the current system only one diagnostic can be added, we need to add multiple diagnostics.

as teh patient/customer can request for multiple diagnostics under the same ticket as part of the medical process.

so we need to add multiple diagnostics to the ticket. and then further we will have to make all the relevent chnages like. 
1. adding multiple diagnostics information in teh ticket details page to disply the information of the multiple diagnostics.
2. now once the ticket is created with multiple diagnostics, the manager/admin will assign the ticket to the field executive for sample pickup.
3. then the field executive will go the required location that is hospital or the patients home for sample pickup as mentioned in the ticket and then upload all ther rrequirements things for the mulitple diagnostics like currently if ther is only one diagnostics there is only one inut to upload the sample image but now we need to add multiple inputs to upload the sample images for the multiple diagnostics. and also for the courier details we need to add multiple inputs to upload the courier details for the multiple diagnostics.
4. then now the backofficer will mark the ticket as sample recieved when the curior sample is recieved, but now as there are multiple samples sent by the field execuive to the back officer we need to add multiple inputs to mark the ticket as sample recieved for the multiple samples. as they can reach in different couriers. 
5. then the backoffice officer will add a 'label code' to these samples but saperate for each diagnostics sample recieved as they can be sent to different labs for testing and not necessarily to the same lab. 
6. then after the backoffice officer recievs the raw report from the labs where the sample was sent they will upload it and then marked the ticket as report chnage the stayus. but now as we sent the diagnostics to multiple labs we need to add multiple inputs to upload the raw report for the multiple diagnostics recieved from that particular lab where the sample was sent
7. then after any report is recieved by the backoffice officer thy will upload it next to the raw report , test, and where it was sent ffor testing. and then as soon as the raw report is uploaded with name of the test for what actually it was sent to the lab for testing. that report with all the information like this test id from which ticket, label code test type etc will be refected tot he scientist. then the scientist will download the raw report and generate the final report and upload it there.
8. the backoffice will not need to wait for all the report to be recieved before uploading it for the scientist to convert them to the final report.
9. but the backofficer can only mark the ticket as report recieved only when all the reportes sent to all the labs are recieved. and then the backoffice officer will mark the ticket as report recieved.
10. but as the backofficer was not waiting to recieve all the reportes and was uploading as soon as they recievved formthe labs so the scientis were also working and uploading the report after theyr analysis of the raw report. and those reports will be displayed on the ticket details page. 
11. so on the ticket detial page we will need a tracker to show how many diagnosts were there under onne ticket and then how many of them were sent, which was sent to hich lab, which is recieved, which is with the lab, which is with the scientist, whichh test final report was generated. etc. 

this tracker can be in the ticket details page.