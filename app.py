import os
import json
import base64
import io
import logging

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import tensorflow as tf
from huggingface_hub import hf_hub_download
from huggingface_hub.utils import EntryNotFoundError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Same repo as this Space; override if you fork (e.g. HF_REPO_ID=otheruser/nutriscan)
HF_REPO_ID = os.environ.get("HF_REPO_ID", "heyandyding/nutriscan")
MODEL_FILENAME = "nutriscan_model.keras"
CLASS_NAMES_FILENAME = "class_names.json"

# Fallback if class_names.json is not in the repo (must match training label order)
DEFAULT_CLASSES = [
    "apple_pie", "chicken_wings", "chocolate_cake", "donuts", "french_fries",
    "fried_rice", "grilled_salmon", "hamburger", "hot_dog", "ice_cream",
    "lasagna", "nachos", "omelette", "pancakes", "pizza",
    "ramen", "steak", "sushi", "tacos", "waffles",
    "caesar_salad", "cheesecake", "fried_calamari", "macarons", "pad_thai",
]

app = Flask(__name__)
CORS(app)


def load_model_and_classes():
    model_path = hf_hub_download(
        repo_id=HF_REPO_ID,
        filename=MODEL_FILENAME,
        repo_type="space",
    )
    logger.info("Loaded model from %s", model_path)
    model = tf.keras.models.load_model(model_path)

    try:
        classes_path = hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=CLASS_NAMES_FILENAME,
            repo_type="space",
        )
        with open(classes_path, encoding="utf-8") as f:
            classes = json.load(f)
        logger.info("Loaded class names from %s", classes_path)
    except EntryNotFoundError:
        classes = DEFAULT_CLASSES
        logger.warning(
            "%s not found in %s; using DEFAULT_CLASSES (%d labels)",
            CLASS_NAMES_FILENAME,
            HF_REPO_ID,
            len(classes),
        )

    return model, classes


model, CLASSES = load_model_and_classes()


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    img_data = base64.b64decode(data["image"])
    img = Image.open(io.BytesIO(img_data)).resize((224, 224)).convert("RGB")
    arr = np.array(img) / 255.0
    arr = np.expand_dims(arr, 0)
    predictions = model.predict(arr)
    top_idx = int(np.argmax(predictions[0]))
    top5_idx = np.argsort(predictions[0])[-5:][::-1]
    return jsonify(
        {
            "label": CLASSES[top_idx],
            "confidence": float(predictions[0][top_idx]),
            "top5": [
                {"label": CLASSES[int(i)], "confidence": float(predictions[0][i])}
                for i in top5_idx
            ],
        }
    )


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860)
