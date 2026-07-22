QHTML7 basic overview and getting started guide
-

Overview
--

QHTML stands for Quick HTML, and is a new language that bridges the gap between CSS, Javascript, and HTML all in a single language. 
QHTML was inspired in design by ReactJS and other React-style variants. The QHTML language itself is a merger of QML from the Qt6 Framework and HTML with a bunch of new features that don't exist in any other language.
It was created originally manually using Javascript and HTML rendering, however as the language has evolved, it has required more and more complex code architecture and design to support the features needed for QHTML to be a modern web language that is able to reproduce 100% of all web content using only QHTML. 
As more features were added, the need to create extremely complex code paths with numerous integrations became such that it was no longer realistic to write the code by hand, and so a massive database was created and paired with OpenAI's Codex to refactor and build the language as it exists today in a portable, flexible, and scalable way. 

Currently, this goal has been achieved in that it is possible to create anything using QHTML without requiring any additional scripts or libraries outside a <q-html> </q-html> block. 

First, extract the release package into any folder where you would normally host web page files from.

1. Download Release:  
  ```wget https://github.com/qhtml/qhtml7/archive/refs/tags/v7.3.12.zip```

2. unzip v7.3.12.zip into your web folder: 
  ```unzip v7.3.12.zip```

3. If you already have a web server, then skip this step.  If you don't have a web server running, then spin up a temporary one with python3 from the :
  ``` cd qhtml7 
      python3 -m http.server ```

4. Now, Use your web browser to navigate to your hosted website or if you created a temporary one in step 3 then navigate to 

  ``` http://127.0.0.1:8000/test/demo.html  ```

5. You should see a bunch of demonstrations of different q-components available in QHTML7. For eachone, Clicking on "Preview" directly above the code shows you the output of the QHTML. You can also view the HTML and JSON versions of the snippet as well as edit the QHTML and then see a live preview update.

6. Thats it. Now you can use the individual editors to mess around with the QHTML language, or for a visual page builder  for QML visit 
  ``` http://127.0.0.1:8000/tools/page-builder.html ```

Basic QHTML hello world:

```
<script src="dist/qhtml.js"></script>
<q-html> div,span { text { hello world } } </q-html>
```

There are many many more features. (see README.md for more details and features)

-----

Recent additions [July 13th - July 21st]
-
July 13
- Added CSS shortcut properties to all component instances that allow for CSS stylesheet manipulation via simplified properties like .width, .height, etc as oppossed to having to ship CSS manipulation boilerplate code with every q-component. 
- Ported towerdefense, a pre-existing repo from QML into QHTML using codex to convert the project into QHTML/Javascript from C++/QML. 

July 15
-- Added responsive layout controls for q-layout, q-row, and q-col, so that these elements will automatically stack or re-arrange based on the available viewport size for mobile responsive design without the need for media queries or javascript polling.

July 16
- Added some basic polishing to the page-builder as well as added the .childList() function globally 
- Updated and generated q-logger for targeted debugging. 
- Used Codex to generate test cases for the q-logger under various conditions and then test its functionality. 
- Updated the spec using codex to summarize the requirements determined by the features needed to be added and the current state of the language.

July 17
- Fixed bug causing q-timer to not properly fire an event on timeout due to a lack of binding of the named reference objects
- Used codex to create strict rules around how the layout builder is allowed to interact and the different conditions which it is allowed to perform certain actions for drag n drop, resizing, and manipulation of content 

July 18
- Used codex to go through the test files and then create README.md additions for each of the test cases that isn't represented in the README.md already.
