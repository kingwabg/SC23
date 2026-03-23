import os
files = [r'c:\Users\junha\.gemini\antigravity\hwp\SC23\fixed_p1.txt', 
         r'c:\Users\junha\.gemini\antigravity\hwp\SC23\fixed_p2.txt', 
         r'c:\Users\junha\.gemini\antigravity\hwp\SC23\fixed_p3.txt', 
         r'c:\Users\junha\.gemini\antigravity\hwp\SC23\fixed_p4.txt', 
         r'c:\Users\junha\.gemini\antigravity\hwp\SC23\fixed_p5.txt', 
         r'c:\Users\junha\.gemini\antigravity\hwp\SC23\fixed_p6.txt']
with open(r'c:\Users\junha\.gemini\antigravity\hwp\SC23\src\pages\ChildrenPage.jsx', 'w', encoding='utf-8') as outfile:
    for f in files:
        with open(f, 'r', encoding='utf-8') as infile:
            outfile.write(infile.read())
print("Combined successfully")
