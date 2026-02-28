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
- State Persistence: Using localStorage so data survives a page refresh.
- Toggle State: A simple boolean isDone to flip tasks back and forth.

Features afterwards
- People can create a task/todo/goal. It appear as a "card" that falls down into a pile (Physics-based UI).
- People can drag the tasks around and clip/pin them up top
    - Peaople can clip/drag them into a "Today" zone at the top or leave them piled up on the bottom
- Let people paste a simple list copied from other apps (notes, notion etc) place and create todo cards according to the list
- Spatial UI (Physics): Instead of a rigid list, tasks are div elements with basic drag-and-drop (using a library like SortableJS or simple CSS transitions).

Not MVP
- People can have multiple pages for different categories of tasks (not MVP)
- Ability to change todo task type (is it incremental/habbit building or is it one and done)
- People can 
- The accountability scheme: If linked to a partner, the tasks are "Pending" until the kumpel also finishes their daily goal.
    - accountability scheme: two people have their todo lists, their daily todos are linked and they are considered DONE (not half done) only when both people do them on their side. They do no have to be identical tasks
    - The "Double-Lock" Accountability: A shared ID connects two users.
- 