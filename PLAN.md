To Do App

MVP Features

- add, delete and edit 'to do' tasks
- mark 'to do' tasks as done (with ability to uncheck)

Ideas
- copy day tasks/set up daily repeat tasks
- have a week view
- accountability scheme
- the todos are cards that drop and pile like a bunch of pieces that you can drag and drop and move around 

Tech stack

- Vite
- Vannila JS
- No BE for now
- To ensure we can attach a backend later without rewriting the whole app, organize the code by Concerns.



1. The Vision & User Flow

A spatial, habit-builder and todo list 

Base features
- CRUD Operations: Create, Read, Update, Delete.
- State Persistence: Using Supabase and local storage (depending on the type of thing) so data survives a page refresh.
- Toggle State: A simple boolean isDone to flip tasks back and forth.

Features afterwards
- People can create a task/todo/goal. It appear as a "card" that falls down into a pile (Physics-based UI).
- People can drag the tasks around and clip/pin them up top
    - Peaple can clip/drag them into a "Prioriy" zone at the top or leave them piled up on the bottom
- Let people paste a simple list copied from other apps (notes, notion etc) place and create todo cards according to the list

Not MVP
- People can have multiple pages for different categories of tasks (not MVP)
- Ability to change todo task type (is it incremental/habbit building or is it one and done)
- People can 
- The accountability scheme: If linked to a partner, the tasks are "Pending" until the kumpel also finishes their daily goal.
    - accountability scheme: two people have their todo lists, their daily todos are linked and they are considered DONE (not half done) only when both people do them on their side. They do no have to be identical tasks
    - The "Double-Lock" Accountability: A shared ID connects two users.
- 


---

1. The "Physics" vs. Data Dilemma

- the card positions in the pile do not have to persist, they should load on each refresh, but the ones that are 'priority zone' should persist, but they will be at the top of the page, not in the pile.

- the spatial arrangement does not have to persist between devices

- there should be a flag for 'priority'


2. The "Double-Lock" Accountability Logic

- I imagine this would work best for when you prioritize todos or maybe selecting how many tasks have to be done from the pile for it to be considered done. Let's the partner A and B agree to do 3 habit forming tasks every day (even if they have a bunch of todos) Let's say person A has done 1 of 3, person B has done 2 of 3. The 1 would be fully done, one would be half done for both and the 3rd would be not done for both. 

- it would be nice for them to update, but for MVP it would be ok with just a refresh

- Maybe there could be a way to 'link' tasks, especially if they are recurring. I imagine these would be most useful for habit accountability 

- There should be away to break this link, no one is forced to stay in this.


3. Data Synchronization & Offline State

- It sounds like local storage might not be necessary for this. 

- Yes, if its a guest I'd like for it to work as you described: For the "Guest" experience (before they log in), we want to allow them to create a full physics pile in Local Storage and then "hydrate" that into Supabase once they finally sign up


4. The "Paste List" Parser

- look for markdown

- treat new line as new card

- it can become a long card with truncation, which is revealed on a click


5. Future-Proofing (Schema Design)

- Task: done once, goes to archive

- Habit: done today, resets tomorrow

- In a perfect world I would like them to be together, as I think people do not feel like these are necessarily that different. But I am open to being persuaded. especially since it's just and idea, not MVP.


6. Partnership Cardinality: Can a user have multiple accountability partners (e.g., one for work, one for gym), or is it strictly 1:1? Would be could to have multiple