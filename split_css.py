import os

os.makedirs("frontend/src/styles/components", exist_ok=True)
os.makedirs("frontend/src/styles/pages", exist_ok=True)

with open("frontend/src/styles/global.css", "r") as f:
    lines = f.readlines()

def write_chunk(name, start, end, mode="w"):
    chunk = "".join(lines[start-1:end])
    with open(name, mode) as f:
        if mode == "a":
            f.write("\n")
        f.write(chunk)

write_chunk("frontend/src/styles/variables.css", 1, 200)
write_chunk("frontend/src/styles/reset.css", 201, 290)
write_chunk("frontend/src/styles/layout.css", 291, 358)
write_chunk("frontend/src/styles/components/buttons.css", 359, 417)
write_chunk("frontend/src/styles/layout.css", 418, 575, "a")
write_chunk("frontend/src/styles/pages/home.css", 576, 647)
write_chunk("frontend/src/styles/components/cards.css", 648, 1021)
write_chunk("frontend/src/styles/components/forms.css", 1022, 1417)
write_chunk("frontend/src/styles/components/misc.css", 1418, 2686)
write_chunk("frontend/src/styles/pages/home.css", 2687, 3666, "a")
write_chunk("frontend/src/styles/layout.css", 3667, 3929, "a")
write_chunk("frontend/src/styles/pages/login.css", 3930, 4370)
write_chunk("frontend/src/styles/pages/signup.css", 4371, 4819)
write_chunk("frontend/src/styles/pages/dashboard.css", 4820, 6584)

print("Split completed successfully!")
