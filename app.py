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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HF_REPO_ID = os.environ.get("HF_REPO_ID", "heyandyding/nutriscan")
CLASS_NAMES_FILENAME = "class_names.json"
WEIGHTS_FILENAME = "nutriscan_model.weights.h5"
KERAS_FILENAME = "nutriscan_model.keras"

DEFAULT_CLASSES = [
    "apple_pie", "chicken_wings", "chocolate_cake", "donuts", "french_fries",
    "fried_rice", "grilled_salmon", "hamburger", "hot_dog", "ice_cream",
    "lasagna", "nachos", "omelette", "pancakes", "pizza",
    "ramen", "steak", "sushi", "tacos", "waffles",
    "caesar_salad", "cheesecake", "fried_calamari", "macarons", "pad_thai",
]

app = Flask(__name__)
CORS(app)


def _search_roots():
    roots = [
        os.environ.get("APP_DIR", ""),
        "/app",
        os.path.dirname(os.path.abspath(__file__)),
    ]
    seen = set()
    for r in roots:
        if r and r not in seen:
            seen.add(r)
            yield r


def _local_file(name: str):
    for root in _search_roots():
        path = os.path.join(root, name)
        if os.path.isfile(path):
            return path
    return None


def _hub_try_download(filename: str):
    try:
        return hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=filename,
            repo_type="space",
        )
    except Exception as e:
        logger.info("Hub has no %s (or download failed): %s", filename, e)
        return None


def load_classes():
    path = _local_file(CLASS_NAMES_FILENAME)
    if path:
        with open(path, encoding="utf-8") as f:
            classes = json.load(f)
        logger.info("Loaded class names from %s", path)
        return classes

    path = _hub_try_download(CLASS_NAMES_FILENAME)
    if path:
        with open(path, encoding="utf-8") as f:
            classes = json.load(f)
        logger.info("Loaded class names from hub cache %s", path)
        return classes

    logger.warning(
        "%s missing; using DEFAULT_CLASSES (%d labels)",
        CLASS_NAMES_FILENAME,
        len(DEFAULT_CLASSES),
    )
    return list(DEFAULT_CLASSES)


def build_model(num_classes: int):
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras import layers, models

    base_model = MobileNetV2(
        input_shape=(224, 224, 3), include_top=False, weights=None
    )
    base_model.trainable = False
    model = models.Sequential(
        [
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dense(128, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(num_classes, activation="softmax"),
        ]
    )
    model.build((None, 224, 224, 3))
    return model


def load_model_and_classes():
    classes = load_classes()
    n = len(classes)
    if n < 2:
        raise RuntimeError("Class list must have at least 2 entries")

    # Prefer weights file (avoids Keras version mismatch on full .keras zips).
    w_path = _local_file(WEIGHTS_FILENAME) or _hub_try_download(WEIGHTS_FILENAME)
    if w_path:
        model = build_model(n)
        model.load_weights(w_path)
        logger.info("Loaded weights from %s", w_path)
        return model, classes

    k_path = _local_file(KERAS_FILENAME) or _hub_try_download(KERAS_FILENAME)
    if k_path:
        logger.info("Loading full Keras model from %s", k_path)
        return tf.keras.models.load_model(k_path), classes

    raise RuntimeError(
        f"No model weights found. Add {WEIGHTS_FILENAME} (recommended) or "
        f"{KERAS_FILENAME} to the Space repo (Files tab or git), or place them under /app in the image."
    )


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
