// Copyright Marcin "szczyglis" Szczyglinski, 2022. All Rights Reserved.
// Email: szczyglis@protonmail.com
// WWW: https://github.com/szczyglis-dev/js-ai-body-tracker
// Library: tracker.js
// Version: 1.0.0
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

const tracker = {
    // config options
    detectorModel: poseDetection.SupportedModels.MoveNet, // detector model
    detectorConfig: { // detector configuration
        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        enableSmoothing: true,
        multiPoseMaxDimension: 256,
        enableTracking: true,
        trackerType: poseDetection.TrackerType.BoundingBox
    },
    autofit: false, // bool, enable autofit on canvas1 scaling
    enableAI: true, // bool, enable or disable tracking
    enablevideo1: true, // bool, enable or disable display original video1 on canvas1 on canvas1
    enable3D: false, // bool, enable or disable 3D keypoints
    pointWidth: 6, // width of line between points
    pointRadius: 8, // point circle radius
    minScore: 0.35, // minimum threshold for estimated point
    log: true, // bool, enable logging to console
    hooks: { // user defined hooks/events
        'beforeupdate': [], // before poses update
        'afterupdate': [], // after poses update
        'statuschange': [], // when status change
        'detectorerror': [], // if detector error 
        'video1error': [] // if video1 error
    },

    // HTML elements
    el3D: '#view_3d', // HTML element for 3D keypoint
    elcanvas1: '#canvas1', // HTML element for canvas1
    elvideo1: '#video1', // HTML element for video1
    
    // internals
    detector: null, // tensor flow detector instance
    reqID: null, // requested frame ID
    isPlaying: false, // bool, current playback state
    isWaiting: false, // bool, waiting for video1 state
    poses: null, // estimated poses
    video1: null, // DOMElement with vidoe
    canvas1: null, // DOMElement with canvas1 
    ctx: null, // canvas1 context instance
    container: null, // container for video1
    status: '', // current status message
    anchors3D: [ // 3D keypoints anchors
        [0, 0, 0],
        [0, 1, 0],
        [-1, 0, 0],
        [-1, -1, 0]
    ],
    scatterGL: null, // ScatterGL instance
    scatterGLEl: null, // DOMElement with ScatterGL container
    scatterGLInitialized: false, // bool, ScatterGL initialization state
    video1JS: null, // video1JS instance 
    paths: {
        // paths between points configuration
        'movenet_posenet': {
            // left hip > left knee
            'l_hip_l_knee': {
                'from_x': ['left_hip'],
                'from_y': ['left_hip'],
                'to_x': ['left_knee'],
                'to_y': ['left_knee'],
                'scores': ['left_knee'],
                'rgb': [42, 163, 69]
            },
            // right hip > right knee
            'r_hip_r_knee': {
                'from_x': ['right_hip'],
                'from_y': ['right_hip'],
                'to_x': ['right_knee'],
                'to_y': ['right_knee'],
                'scores': ['right_knee'],
                'rgb': [42, 163, 69]
            },
            // hips (mid-point)
            'hip_l_m': { // left
                'from_x': ['left_hip'],
                'from_y': ['left_hip'],
                'to_x': ['left_hip', 'right_hip'],
                'to_y': ['left_hip', 'right_hip'],
                'scores': ['left_hip', 'right_hip'],
                'rgb': [140, 232, 90]
            },
            'hip_r_m': { // right
                'from_x': ['right_hip'],
                'from_y': ['right_hip'],
                'to_x': ['left_hip', 'right_hip'],
                'to_y': ['left_hip', 'right_hip'],
                'scores': ['left_hip', 'right_hip'],
                'rgb': [140, 232, 90]
            },
            // hip to shoulders
            'hip_l_shoulder_l': { // left
                'from_x': ['left_hip'],
                'from_y': ['left_hip'],
                'to_x': ['left_shoulder'],
                'to_y': ['left_shoulder'],
                'scores': ['left_hip', 'left_shoulder'],
                'rgb': [242, 85, 240]
            },
            'hip_r_shoulder_r': { // right
                'from_x': ['right_hip'],
                'from_y': ['right_hip'],
                'to_x': ['right_shoulder'],
                'to_y': ['right_shoulder'],
                'scores': ['right_hip', 'right_shoulder'],
                'rgb': [242, 85, 240]
            },
            // left knee > left ankle
            'l_knee_l_ankle': {
                'from_x': ['left_knee'],
                'from_y': ['left_knee'],
                'to_x': ['left_ankle'],
                'to_y': ['left_ankle'],
                'scores': ['left_ankle'],
                'rgb': [140, 232, 90]
            },
            // right knee > right ankle
            'r_knee_r_ankle': {
                'from_x': ['right_knee'],
                'from_y': ['right_knee'],
                'to_x': ['right_ankle'],
                'to_y': ['right_ankle'],
                'scores': ['right_ankle'],
                'rgb': [140, 232, 90]
            },
            // hips > shoulders
            'hips_shoulders_m': {
                'from_x': ['left_hip', 'right_hip'],
                'from_y': ['left_hip', 'right_hip'],
                'to_x': ['left_shoulder', 'right_shoulder'],
                'to_y': ['left_shoulder', 'right_shoulder'],
                'scores': ['left_hip', 'right_hip'],
                'rgb': [242, 85, 240]
            },
            // shoulders (mid-point)
            'shoulder_l_m': { // left
                'from_x': ['left_shoulder'],
                'from_y': ['left_shoulder'],
                'to_x': ['left_shoulder', 'right_shoulder'],
                'to_y': ['left_shoulder', 'right_shoulder'],
                'scores': ['left_shoulder', 'right_shoulder'],
                'rgb': [92, 70, 235]
            },
            'shoulder_r_m': { // right
                'from_x': ['right_shoulder'],
                'from_y': ['right_shoulder'],
                'to_x': ['left_shoulder', 'right_shoulder'],
                'to_y': ['left_shoulder', 'right_shoulder'],
                'scores': ['left_shoulder', 'right_shoulder'],
                'rgb': [92, 70, 235]
            },
            // shoulders (mid-point) > nose (neck)
            'neck': {
                'from_x': ['left_shoulder', 'right_shoulder'],
                'from_y': ['left_shoulder', 'right_shoulder'],
                'to_x': ['left_ear', 'right_ear'],
                'to_y': ['left_ear', 'right_ear'],
                'scores': ['left_shoulder', 'right_shoulder'],
                'rgb': [92, 108, 145]
            },
            // left shoulder > left elbow
            'l_shoulder_l_elbow': {
                'from_x': ['left_shoulder'],
                'from_y': ['left_shoulder'],
                'to_x': ['left_elbow'],
                'to_y': ['left_elbow'],
                'scores': ['left_elbow'],
                'rgb': [245, 129, 66]
            },
            // right shoulder > right elbow
            'r_shoulder_r_elbow': {
                'from_x': ['right_shoulder'],
                'from_y': ['right_shoulder'],
                'to_x': ['right_elbow'],
                'to_y': ['right_elbow'],
                'scores': ['right_elbow'],
                'rgb': [245, 129, 66]
            },
            // left elbow > left wrist
            'l_elbow_l_wrist': {
                'from_x': ['left_elbow'],
                'from_y': ['left_elbow'],
                'to_x': ['left_wrist'],
                'to_y': ['left_wrist'],
                'scores': ['left_wrist'],
                'rgb': [227, 156, 118]
            },
            // right elbow > right wrist
            'r_elbow_r_wrist': {
                'from_x': ['right_elbow'],
                'from_y': ['right_elbow'],
                'to_x': ['right_wrist'],
                'to_y': ['right_wrist'],
                'scores': ['right_wrist'],
                'rgb': [227, 156, 118]
            },
            // nose > left eye
            'nose_l_eye': {
                'from_x': ['nose'],
                'from_y': ['nose'],
                'to_x': ['left_eye'],
                'to_y': ['left_eye'],
                'scores': ['left_eye'],
                'rgb': [255, 0, 0]
            },
            // nose > right eye
            'nose_r_eye': {
                'from_x': ['nose'],
                'from_y': ['nose'],
                'to_x': ['right_eye'],
                'to_y': ['right_eye'],
                'scores': ['right_eye'],
                'rgb': [255, 0, 0]
            },
            // left eye > left ear
            'l_eye_l_ear': {
                'from_x': ['left_eye'],
                'from_y': ['left_eye'],
                'to_x': ['left_ear'],
                'to_y': ['left_ear'],
                'scores': ['left_ear'],
                'rgb': [197, 217, 15]
            },
            // right eye > right ear
            'r_eye_r_ear': {
                'from_x': ['right_eye'],
                'from_y': ['right_eye'],
                'to_x': ['right_ear'],
                'to_y': ['right_ear'],
                'scores': ['right_eye'],
                'rgb': [197, 217, 15]
            }
        },
        'blaze_pose': {
            // left hip > left knee
            'l_hip_l_knee': {
                'from_x': ['left_hip'],
                'from_y': ['left_hip'],
                'to_x': ['left_knee'],
                'to_y': ['left_knee'],
                'scores': ['left_knee'],
                'rgb': [42, 163, 69]
            },
            // right hip > right knee
            'r_hip_r_knee': {
                'from_x': ['right_hip'],
                'from_y': ['right_hip'],
                'to_x': ['right_knee'],
                'to_y': ['right_knee'],
                'scores': ['right_knee'],
                'rgb': [42, 163, 69]
            },
            // hips (mid-point)
            'hip_l_m': { // left
                'from_x': ['left_hip'],
                'from_y': ['left_hip'],
                'to_x': ['left_hip', 'right_hip'],
                'to_y': ['left_hip', 'right_hip'],
                'scores': ['left_hip', 'right_hip'],
                'rgb': [140, 232, 90]
            },
            'hip_r_m': { // right
                'from_x': ['right_hip'],
                'from_y': ['right_hip'],
                'to_x': ['left_hip', 'right_hip'],
                'to_y': ['left_hip', 'right_hip'],
                'scores': ['left_hip', 'right_hip'],
                'rgb': [140, 232, 90]
            },
            // hip to shoulders
            'hip_l_shoulder_l': { // left
                'from_x': ['left_hip'],
                'from_y': ['left_hip'],
                'to_x': ['left_shoulder'],
                'to_y': ['left_shoulder'],
                'scores': ['left_hip', 'left_shoulder'],
                'rgb': [242, 85, 240]
            },
            'hip_r_shoulder_r': { // right
                'from_x': ['right_hip'],
                'from_y': ['right_hip'],
                'to_x': ['right_shoulder'],
                'to_y': ['right_shoulder'],
                'scores': ['right_hip', 'right_shoulder'],
                'rgb': [242, 85, 240]
            },
            // left knee > left ankle
            'l_knee_l_ankle': {
                'from_x': ['left_knee'],
                'from_y': ['left_knee'],
                'to_x': ['left_ankle'],
                'to_y': ['left_ankle'],
                'scores': ['left_ankle'],
                'rgb': [140, 232, 90]
            },
            // right knee > right ankle
            'r_knee_r_ankle': {
                'from_x': ['right_knee'],
                'from_y': ['right_knee'],
                'to_x': ['right_ankle'],
                'to_y': ['right_ankle'],
                'scores': ['right_ankle'],
                'rgb': [140, 232, 90]
            },
            // left ankle > left heel
            'l_ankle_l_heel': {
                'from_x': ['left_ankle'],
                'from_y': ['left_ankle'],
                'to_x': ['left_heel'],
                'to_y': ['left_heel'],
                'scores': ['left_ankle', 'left_heel'],
                'rgb': [42, 163, 69]
            },
            // left heel > left foot_index
            'l_heel_l_foot_index': {
                'from_x': ['left_heel'],
                'from_y': ['left_heel'],
                'to_x': ['left_foot_index'],
                'to_y': ['left_foot_index'],
                'scores': ['left_heel', 'left_foot_index'],
                'rgb': [42, 163, 69]
            },
            // left foot_index > left ankle
            'l_foot_index_l_ankle': {
                'from_x': ['left_foot_index'],
                'from_y': ['left_foot_index'],
                'to_x': ['left_ankle'],
                'to_y': ['left_ankle'],
                'scores': ['left_foot_index', 'left_ankle'],
                'rgb': [42, 163, 69]
            },
            // right ankle > right heel
            'r_ankle_r_heel': {
                'from_x': ['right_ankle'],
                'from_y': ['right_ankle'],
                'to_x': ['right_heel'],
                'to_y': ['right_heel'],
                'scores': ['right_ankle', 'right_heel'],
                'rgb': [42, 163, 69]
            },
            // right heel > right foot_index
            'r_heel_r_foot_index': {
                'from_x': ['right_heel'],
                'from_y': ['right_heel'],
                'to_x': ['right_foot_index'],
                'to_y': ['right_foot_index'],
                'scores': ['right_heel', 'right_foot_index'],
                'rgb': [42, 163, 69]
            },
            // right foot_index > right ankle
            'r_foot_index_r_ankle': {
                'from_x': ['right_foot_index'],
                'from_y': ['right_foot_index'],
                'to_x': ['right_ankle'],
                'to_y': ['right_ankle'],
                'scores': ['right_foot_index', 'right_ankle'],
                'rgb': [42, 163, 69]
            },
            // hips > shoulders
            'hips_shoulders_m': {
                'from_x': ['left_hip', 'right_hip'],
                'from_y': ['left_hip', 'right_hip'],
                'to_x': ['left_shoulder', 'right_shoulder'],
                'to_y': ['left_shoulder', 'right_shoulder'],
                'scores': ['left_hip', 'right_hip'],
                'rgb': [242, 85, 240]
            },
            // shoulders (mid-point)
            'shoulder_l_m': { // left
                'from_x': ['left_shoulder'],
                'from_y': ['left_shoulder'],
                'to_x': ['left_shoulder', 'right_shoulder'],
                'to_y': ['left_shoulder', 'right_shoulder'],
                'scores': ['left_shoulder', 'right_shoulder'],
                'rgb': [92, 70, 235]
            },
            'shoulder_r_m': { // right
                'from_x': ['right_shoulder'],
                'from_y': ['right_shoulder'],
                'to_x': ['left_shoulder', 'right_shoulder'],
                'to_y': ['left_shoulder', 'right_shoulder'],
                'scores': ['left_shoulder', 'right_shoulder'],
                'rgb': [92, 70, 235]
            },
            // shoulders (mid-point) > nose (neck)
            'neck': {
                'from_x': ['left_shoulder', 'right_shoulder'],
                'from_y': ['left_shoulder', 'right_shoulder'],
                'to_x': ['left_ear', 'right_ear'],
                'to_y': ['left_ear', 'right_ear'],
                'scores': ['left_shoulder', 'right_shoulder'],
                'rgb': [92, 108, 145]
            },
            // left shoulder > left elbow
            'l_shoulder_l_elbow': {
                'from_x': ['left_shoulder'],
                'from_y': ['left_shoulder'],
                'to_x': ['left_elbow'],
                'to_y': ['left_elbow'],
                'scores': ['left_elbow'],
                'rgb': [245, 129, 66]
            },
            // right shoulder > right elbow
            'r_shoulder_r_elbow': {
                'from_x': ['right_shoulder'],
                'from_y': ['right_shoulder'],
                'to_x': ['right_elbow'],
                'to_y': ['right_elbow'],
                'scores': ['right_elbow'],
                'rgb': [245, 129, 66]
            },
            // left elbow > left wrist
            'l_elbow_l_wrist': {
                'from_x': ['left_elbow'],
                'from_y': ['left_elbow'],
                'to_x': ['left_wrist'],
                'to_y': ['left_wrist'],
                'scores': ['left_wrist'],
                'rgb': [227, 156, 118]
            },
            // right elbow > right wrist
            'r_elbow_r_wrist': {
                'from_x': ['right_elbow'],
                'from_y': ['right_elbow'],
                'to_x': ['right_wrist'],
                'to_y': ['right_wrist'],
                'scores': ['right_wrist'],
                'rgb': [227, 156, 118]
            },

            // left wrist > left_thumb
            'l_wrist_l_thumb': {
                'from_x': ['left_wrist'],
                'from_y': ['left_wrist'],
                'to_x': ['left_thumb'],
                'to_y': ['left_thumb'],
                'scores': ['left_wrist', 'left_thumb'],
                'rgb': [245, 129, 66]
            },
            // left wrist > left_pinky
            'l_wrist_l_pinky': {
                'from_x': ['left_wrist'],
                'from_y': ['left_wrist'],
                'to_x': ['left_pinky'],
                'to_y': ['left_pinky'],
                'scores': ['left_wrist', 'left_pinky'],
                'rgb': [245, 129, 66]
            },
            // left pinky > left index
            'l_pinky_l_index': {
                'from_x': ['left_pinky'],
                'from_y': ['left_pinky'],
                'to_x': ['left_index'],
                'to_y': ['left_index'],
                'scores': ['left_pinky', 'left_index'],
                'rgb': [245, 129, 66]
            },
            // left index > left wrist
            'l_index_l_wrist': {
                'from_x': ['left_index'],
                'from_y': ['left_index'],
                'to_x': ['left_wrist'],
                'to_y': ['left_wrist'],
                'scores': ['left_index', 'left_wrist'],
                'rgb': [245, 129, 66]
            },
            // right wrist > right_thumb
            'r_wrist_r_thumb': {
                'from_x': ['right_wrist'],
                'from_y': ['right_wrist'],
                'to_x': ['right_thumb'],
                'to_y': ['right_thumb'],
                'scores': ['right_wrist', 'right_thumb'],
                'rgb': [245, 129, 66]
            },
            // right wrist > right_pinky
            'r_wrist_r_pinky': {
                'from_x': ['right_wrist'],
                'from_y': ['right_wrist'],
                'to_x': ['right_pinky'],
                'to_y': ['right_pinky'],
                'scores': ['right_wrist', 'right_pinky'],
                'rgb': [245, 129, 66]
            },
            // right pinky > right index
            'r_pinky_r_index': {
                'from_x': ['right_pinky'],
                'from_y': ['right_pinky'],
                'to_x': ['right_index'],
                'to_y': ['right_index'],
                'scores': ['right_pinky', 'right_index'],
                'rgb': [245, 129, 66]
            },
            // right index > right wrist
            'r_index_r_wrist': {
                'from_x': ['right_index'],
                'from_y': ['right_index'],
                'to_x': ['right_wrist'],
                'to_y': ['right_wrist'],
                'scores': ['right_index', 'right_wrist'],
                'rgb': [245, 129, 66]
            },
            // nose > left eye_inner
            'nose_l_eye_inner': {
                'from_x': ['nose'],
                'from_y': ['nose'],
                'to_x': ['left_eye_inner'],
                'to_y': ['left_eye_inner'],
                'scores': ['left_eye_inner'],
                'rgb': [255, 0, 0]
            },

            // nose > right eye_inner
            'nose_r_eye_inner': {
                'from_x': ['nose'],
                'from_y': ['nose'],
                'to_x': ['right_eye_inner'],
                'to_y': ['right_eye_inner'],
                'scores': ['right_eye_inner'],
                'rgb': [255, 0, 0]
            },
            // mouth_left > mouth_right
            'l_mouth_r_mouth': {
                'from_x': ['mouth_left'],
                'from_y': ['mouth_left'],
                'to_x': ['mouth_right'],
                'to_y': ['mouth_right'],
                'scores': ['mouth_left', 'mouth_right'],
                'rgb': [150, 0, 0]
            },
            // mouth_right > mouth_left
            'r_mouth_l_mouth': {
                'from_x': ['mouth_right'],
                'from_y': ['mouth_right'],
                'to_x': ['mouth_left'],
                'to_y': ['mouth_left'],
                'scores': ['mouth_right', 'mouth_left'],
                'rgb': [150, 0, 0]
            },

            // left eye > left eye_outer
            'l_eye_l_eye_outer': {
                'from_x': ['left_eye'],
                'from_y': ['left_eye'],
                'to_x': ['left_eye_outer'],
                'to_y': ['left_eye_outer'],
                'scores': ['left_eye_outer'],
                'rgb': [197, 117, 15]
            },
            // left eye_outer > left ear
            'l_eye_outer_l_ear': {
                'from_x': ['left_eye_outer'],
                'from_y': ['left_eye_outer'],
                'to_x': ['left_ear'],
                'to_y': ['left_ear'],
                'scores': ['left_ear'],
                'rgb': [197, 117, 15]
            },
            // left eye_inner > left eye
            'l_eye_inner_l_eye': {
                'from_x': ['left_eye_inner'],
                'from_y': ['left_eye_inner'],
                'to_x': ['left_eye'],
                'to_y': ['left_eye'],
                'scores': ['left_eye'],
                'rgb': [197, 217, 15]
            },
            // right eye > right eye_outer
            'r_eye_r_eye_outer': {
                'from_x': ['right_eye'],
                'from_y': ['right_eye'],
                'to_x': ['right_eye_outer'],
                'to_y': ['right_eye_outer'],
                'scores': ['right_eye_outer'],
                'rgb': [197, 117, 15]
            },
            // right eye_outer > right ear
            'r_eye_outer_r_ear': {
                'from_x': ['right_eye_outer'],
                'from_y': ['right_eye_outer'],
                'to_x': ['right_ear'],
                'to_y': ['right_ear'],
                'scores': ['right_ear'],
                'rgb': [197, 117, 15]
            },
            // right eye_inner > right eye
            'r_eye_inner_r_eye': {
                'from_x': ['right_eye_inner'],
                'from_y': ['right_eye_inner'],
                'to_x': ['right_eye'],
                'to_y': ['right_eye'],
                'scores': ['right_eye'],
                'rgb': [197, 217, 15]
            },
        }
    },

    /*
        Run predictions
     */
    run: function(source) {
        switch (source) {
            case 'video1':
                tracker.initvideo1();
                break;
            case 'camera':
                tracker.initCamera();
                break;
            case 'stream':
                tracker.initStream();
                break;
        }
    },

    /*
        Initialize ScatterGL
     */
    init3D: function() {
        if (tracker.scatterGLEl == null) {
            return;
        }
        // init and store instance
        tracker.scatterGL = new ScatterGL(tracker.scatterGLEl, {
            'rotateOnStart': true,
            'selectEnabled': false,
            'styles': {
                polyline: {
                    defaultOpacity: 1,
                    deselectedOpacity: 1
                },
                fog: {
                    enabled: false
                }
            }
        });
    },

    /*
        Initialize core elements
     */
    init: function() {
        tracker.log('Initializing...');

        // init elements
        tracker.video1 = document.querySelector(tracker.elvideo1);
        tracker.canvas1 = document.querySelector(tracker.elcanvas1),
            tracker.scatterGLEl = document.querySelector(tracker.el3D);
        tracker.ctx = tracker.canvas1.getContext("2d");

        // instantiate ScatterGL for 3D points view (BlazePose model only)
        if (tracker.detectorModel == poseDetection.SupportedModels.BlazePose) {
            tracker.init3D();
        }
    },

    /*
        Initialize video1 stream
     */
    initStream: function() {
        tracker.init();
        tracker.video1JS = video1js('video1'); // initialize video1.js
        tracker.video1 = document.querySelector("video1#video1, #video1 video1");

        // initial settings
        tracker.video1.autoPlay = false;
        tracker.video1.loop = false;
        tracker.container = {
            video1: tracker.video1,
            ready: false,
        };

        // setup video1 events
        tracker.video1.addEventListener('playing', function() {
            tracker.log('Event: playing');
            tracker.isWaiting = false;
            tracker.onStreamReady();
        }, false);

        tracker.video1.addEventListener('play', function() {
            tracker.log('Event: play');
        }, false);

        tracker.video1.addEventListener('loadedmetadata', function() {
            tracker.log('Event: loadedmetadata');
            tracker.container.ready = true;
            tracker.showPlaybackControls();
        }, false);

        tracker.video1.addEventListener('error', function(e) {
            console.error(e);
            tracker.dispatch('video1error', e);
            tracker.setStatus('Error');
        }, true);

        // setup play/pause event
        tracker.canvas1.addEventListener("click", function() {
            tracker.playPauseClick();
        });
    },

    /*
        Load video1 stream from source using video1JS
     */
    loadStream: function(src) {
        tracker.log('Loading source: ' + src);
        tracker.setStatus('Please wait...loading...');

        // cancel current frame update if present
        if (tracker.reqID != null) {
            window.cancelAnimationFrame(tracker.reqID);
        }

        // dispose current detector
        if (tracker.detector != null) {
            tracker.detector.dispose();
        }
        tracker.detector = null;

        // pause, switch source and play new
        tracker.video1.pause();
        tracker.video1JS.src({
            src: src,
            type: 'application/x-mpegURL'
        });
        tracker.container = {
            video1: tracker.video1,
            ready: true,
        };
        tracker.video1JS.play();
    },

    /*
        Handle stream
     */
    handleStream: async function() {
        tracker.log('Handling stream...');
        tracker.onStreamReady();
    },

    /*
        Launch video1 stream when ready
     */
    onStreamReady: async function(e) {
        tracker.log('On Stream ready');

        // create detector
        if (tracker.detector == null) {
            tracker.detector = await poseDetection.createDetector(
                tracker.detectorModel,
                tracker.detectorConfig
            );
        }

        // set dimensions
        tracker.video1.width = tracker.container.video1.video1Width;
        tracker.video1.height = tracker.container.video1.video1Height;
        tracker.canvas1.width = tracker.container.video1.video1Width;
        tracker.canvas1.height = tracker.container.video1.video1Height;

        // cancel current frame update if present
        if (tracker.reqID != null) {
            window.cancelAnimationFrame(tracker.reqID);
        }

        // init frame update
        tracker.reqID = window.requestAnimationFrame(tracker.video1Frame);
    },

    /*
        Initialize video1
     */
    initvideo1: async function() {
        // initialize
        tracker.init();

        // setup video1
        tracker.video1.autoPlay = true;
        tracker.video1.loop = false;
        tracker.container = {
            video1: tracker.video1,
            ready: true,
        };

        // setup video1 events
        tracker.video1.addEventListener('loadedmetadata', function() {
            tracker.log('Event: loadedmetadata');
            tracker.container.ready = true;
            tracker.showPlaybackControls();
            //this.currentTime = 210; // optional - set video1 start time
        }, false);

        tracker.video1.addEventListener('playing', function() {
            tracker.log('Event: playing');
            tracker.isWaiting = false;
            if (!tracker.isPlaying) {
                tracker.onvideo1Ready();
                tracker.isPlaying = true;
            }
        }, false);

        tracker.video1.addEventListener('play', function() {
            tracker.log('Event: play');
        }, false);

        tracker.video1.addEventListener('error', function(e) {
            console.error(e);
            tracker.dispatch('video1error', e);
            tracker.setStatus('Error');
        }, true);

        // setup play/pause click event
        tracker.canvas1.addEventListener("click", function() {
            tracker.playPauseClick();
        });
    },

    /*
        Launch video1 when ready
     */
    onvideo1Ready: async function(e) {
        tracker.log('On video1 ready');

        // cancel current frame update if present
        if (tracker.reqID != null) {
            window.cancelAnimationFrame(tracker.reqID);
        }

        // create detector
        tracker.detector = await poseDetection.createDetector(
            tracker.detectorModel,
            tracker.detectorConfig
        );

        // set dimensions
        tracker.video1.width = tracker.container.video1.video1Width;
        tracker.video1.height = tracker.container.video1.video1Height;
        tracker.canvas1.width = tracker.container.video1.video1Width;
        tracker.canvas1.height = tracker.container.video1.video1Height;
        tracker.container.ready = true;

        // init frame update
        tracker.reqID = window.requestAnimationFrame(tracker.video1Frame);
    },

    /*
        Load video1 from source address
     */
    loadvideo1: function(src) {
        tracker.log('Loading source: ' + src);
        tracker.setStatus('Please wait...loading...');

        tracker.isPlaying = false; // allow new initialization

        // cancel current frame update if present
        if (tracker.reqID != null) {
            window.cancelAnimationFrame(tracker.reqID);
        }

        // dispose current detector
        if (tracker.detector != null) {
            tracker.detector.dispose();
        }
        tracker.detector = null;

        // pause, change source and play new
        tracker.video1.pause();
        tracker.video1.src = src;
        tracker.container = {
            video1: tracker.video1,
            ready: true,
        };
        tracker.video1.play();
    },

    /*
        Render video1 frame
     */
    video1Frame: async function() {

        tracker.setStatus('');

        // check if video1 is ready
        if (tracker.container !== undefined && tracker.container.ready) {
            if (tracker.enableAI && tracker.container.video1 != null) {
                // try to detect poses
                try {
                    const estimationConfig = {
                        flipHorizontal: false
                    };
                    const timestamp = performance.now();
                    tracker.poses = await tracker.detector.estimatePoses(tracker.container.video1, 
                        estimationConfig, timestamp);
                } catch (err) {
                    tracker.dispatch('detectorerror', err);
                    console.error(err);
                }
            }

            // clear canvas1
            tracker.clearcanvas1();

            // draw video1 frame on canvas1
            if (tracker.enablevideo1) {
                tracker.ctx.drawImage(tracker.container.video1,
                    0,
                    0,
                    tracker.container.video1.video1Width,
                    tracker.container.video1.video1Height);
            }

            // handle detected poses
            if (tracker.enableAI) {
                tracker.handlePoses();
            }

            // if video1 is paused then show controls
            if (tracker.container.video1.paused) {
                tracker.showPlaybackControls();
            }
        }

        // next frame
        tracker.reqID = window.requestAnimationFrame(tracker.video1Frame);
    },

    /*
        Initialize camera
     */
    initCamera: async function() {
        tracker.init();

        // init detectot
        tracker.detector = await poseDetection.createDetector(
            tracker.detectorModel,
            tracker.detectorConfig
        );

        // init camera
        try {
            tracker.video1 = await tracker.setupCamera();
            tracker.video1.play();
            tracker.cameraFrame();
        } catch (e) {
            tracker.dispatch('video1error', e);
            console.error(e);
        }
    },

    /*
        Set-up camera
     */
    setupCamera: async function() {
        tracker.setStatus('Please wait...initializing camera...');
        // init device
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error(
                "Browser API navigator.mediaDevices.getUserMedia not available"
            );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video1: {
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 720
                },
            },
        });
        tracker.video1.srcObject = stream; // attach camera stream to video1

        // get width and height of the camera video1 stream
        let stream_settings = stream.getvideo1Tracks()[0].getSettings();
        let stream_width = stream_settings.width;
        let stream_height = stream_settings.height;

        // re-init width and height with info from stream
        tracker.video1.width = stream_width;
        tracker.video1.height = stream_height;

        return new Promise((resolve) => {
            tracker.video1.onloadedmetadata = () => resolve(video1);
        });
    },

    /*
        Render camera frame
     */
    cameraFrame: async function() {
        tracker.setStatus('');

        // predict poses
        tracker.poses = await tracker.detector.estimatePoses(tracker.video1);

        // setup dimensions
        tracker.canvas1.width = tracker.canvas1.scrollWidth;
        tracker.canvas1.height = tracker.canvas1.scrollHeight;
        if (tracker.video1.readyState === tracker.video1.HAVE_ENOUGH_DATA) {
            let xOffset = 0;
            const video1Size = {
                width: tracker.video1.video1Width,
                height: tracker.video1.video1Height
            };
            const canvas1Size = {
                width: tracker.canvas1.width,
                height: tracker.canvas1.height
            };
            const renderSize = tracker.calculateSize(video1Size, canvas1Size);
            xOffset = (canvas1Size.width - renderSize.width) / 2;

            // clear canvas1
            tracker.clearcanvas1();

            // draw video1 frame from camera on canvas1
            if (tracker.enablevideo1) {
                tracker.ctx.drawImage(tracker.video1, xOffset, 0, renderSize.width, renderSize.height);
            }
        }

        // handle poses
        if (tracker.enableAI) {
            tracker.handlePoses();
        }

        // next frame
        tracker.reqID = window.requestAnimationFrame(tracker.cameraFrame);
    },

    /*
        Find and return pose keypoints by keypoint's name
     */
    findKeypoint: function(name, pose) {
        for (const keypoint of pose.keypoints) {
            if (keypoint.name == name) {
                return keypoint;
            }
        }
    },

    /*
        Find and return pose keypoint coordinate (X or Y) by keypoint's name
     */
    findPosePoint: function(axis, name, pose) {
        const kp = tracker.findKeypoint(name, pose);
        return kp[axis];
    },

    /*
        Return coordinate (X or Y) for points in path
     */
    getCoord: function(axis, points, pose) {
        // if only one point then return coordinate for this one
        if (points.length == 1) {
            return tracker.findPosePoint(axis, points[0], pose);
        } else {
            // if multiple points then calculate coordinate between them
            let sum = 0.0;
            for (const el of points) {
                sum += tracker.findPosePoint(axis, el, pose);
            }
            return sum / points.length;
        }
    },

    /*
        Return coordinates for path
     */
    getCoords: function(path, pose) {
        return {
            'from_x': tracker.getCoord('x', path.from_x, pose),
            'from_y': tracker.getCoord('y', path.from_y, pose),
            'to_x': tracker.getCoord('x', path.to_x, pose),
            'to_y': tracker.getCoord('y', path.to_y, pose),
        };
    },

    /*
        Get score for path
     */
    getScore: function(path, pose) {
        // if only one point then check score for this one
        if (path.scores.length == 1) {
            return tracker.findKeypoint(path.scores[0], pose).score;
        } else {
            // if multiple points then check score for all
            let sum = 0.0;
            for (const el of path.scores) {
                sum += tracker.findKeypoint(el, pose).score;
            }
            return sum / path.scores.length;
        }
    },

    /*
        Checks if path has required minimum score do draw it on canvas1
     */
    hasScore: function(path, pose) {
        let res = true;
        // if only one point then check score for this one
        if (path.scores.length == 1) {
            if (tracker.findKeypoint(path.scores[0], pose).score < tracker.minScore) {
                res = false;
            }
        } else {
            // if multiple points then check score for all
            for (const el of path.scores) {
                if (tracker.findKeypoint(el, pose).score < tracker.minScore) {
                    res = false;
                    break;
                }
            }
        }
        return res;
    },

    /*
        Re-calculate size between source and destination area
     */
    calculateSize: function(srcSize, dstSize) {
        const srcRatio = srcSize.width / srcSize.height;
        const dstRatio = dstSize.width / dstSize.height;
        if (dstRatio > srcRatio) {
            return {
                width: dstSize.height * srcRatio,
                height: dstSize.height
            };
        } else {
            return {
                width: dstSize.width,
                height: dstSize.width / srcRatio
            };
        }
    },

    /*
        Re-calculate/scale X position of point
     */
    scaleX: function(x) {
        const video1Size = {
            width: tracker.video1.video1Width,
            height: tracker.video1.video1Height
        };
        const canvas1Size = {
            width: tracker.canvas1.width,
            height: tracker.canvas1.height
        };
        const renderSize = tracker.calculateSize(video1Size, canvas1Size);
        let xOffset = (canvas1Size.width - renderSize.width) / 2;
        const factor = (renderSize.width) / video1Size.width;

        if (!tracker.autofit) {
            xOffset = 0;
        }

        return Math.ceil(x * factor) + xOffset;
    },

    /*
        Re-calculate/scale Y position of point
     */
    scaleY: function(y) {
        const video1Size = {
            width: tracker.video1.video1Width,
            height: tracker.video1.video1Height
        };
        const canvas1Size = {
            width: tracker.canvas1.width,
            height: tracker.canvas1.height
        };
        const renderSize = tracker.calculateSize(video1Size, canvas1Size);
        let yOffset = (canvas1Size.height - renderSize.height) / 2;

        // if vertical then cancel offset
        if (window.innerHeight > window.innerWidth || !tracker.autofit) {
            yOffset = 0;
        }

        const factor = renderSize.height / video1Size.height;
        return Math.ceil(y * factor) + yOffset;
    },

    /*
        Handle poses and draw them on canvas1
     */
    handlePoses: function() {
        // run user defined hooks
        tracker.dispatch('beforeupdate', tracker.poses);

        if (tracker.poses && tracker.poses.length > 0) {
            let pathlist;

            // get corrent pathlist for specified neural net
            switch (tracker.detectorModel) {
                case poseDetection.SupportedModels.MoveNet:
                case poseDetection.SupportedModels.PoseNet:
                    pathlist = tracker.paths['movenet_posenet'];
                    break;
                case poseDetection.SupportedModels.BlazePose:
                    pathlist = tracker.paths['blaze_pose'];
                    break;
            }

            let point, score;

            // loop on all finded poses
            for (let pose of tracker.poses) {

                // loop on pathslist
                for (let k in pathlist) {
                    
                    if (pathlist.hasOwnProperty(k)) {
                        
                        // if there is no required threeshold (score) then next
                        if (!tracker.hasScore(pathlist[k], pose)) {
                            continue;
                        }
                        point = tracker.getCoords(pathlist[k], pose); // get X,Y coords of path
                        score = tracker.getScore(pathlist[k], pose); // calculate score for path

                        // draw path on canvas1
                        tracker.drawPath(point.from_x,
                            point.from_y,
                            point.to_x,
                            point.to_y,
                            pathlist[k].rgb[0],
                            pathlist[k].rgb[1],
                            pathlist[k].rgb[2],
                            score);
                    }
                }

                // draw 3D points if available using ScatterGL
                if (tracker.enable3D && pose.keypoints3D != null && pose.keypoints3D.length > 0) {
                    tracker.drawKeypoints3D(pose.keypoints3D);
                }
            }
        }

        // run user defined hooks
        tracker.dispatch('afterupdate', tracker.poses);
    },

    /*
        Draw point and bone on canvas1
     */
    drawPath: function(fromX, fromY, toX, toY, r, g, b, score) {
        // use score to calculate alpha
        let a = score - 0.15;
        if (a < 0) {
            a = 0.0;
        }
        // draw connection
        tracker.drawLine(tracker.scaleX(fromX), tracker.scaleY(fromY), 
            tracker.scaleX(toX), tracker.scaleY(toY), 
            r, g, b, a);

        // draw joint
        tracker.drawCircle(tracker.scaleX(fromX), tracker.scaleY(fromY), 
            r, g, b, a);
    },

    /*
        Draw connection between points on canvas1
     */
    drawLine: function(fromX, fromY, toX, toY, r, g, b, a) {
        tracker.ctx.beginPath();
        tracker.ctx.lineWidth = tracker.pointWidth;
        tracker.ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        tracker.ctx.moveTo(fromX, fromY);
        tracker.ctx.lineTo(toX, toY);
        tracker.ctx.stroke();
        tracker.ctx.closePath();
    },

    /*
        Draw point on canvas1
     */
    drawCircle: function(fromX, fromY, r, g, b, a) {
        tracker.ctx.beginPath();
        tracker.ctx.arc(fromX, fromY, tracker.pointRadius, 0, 2 * Math.PI);
        tracker.ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        tracker.ctx.fill();
        tracker.ctx.closePath();
    },

    /*
        Draw 3D keypoints using ScatterGL
     */
    drawKeypoints3D: function(keypoints) {
        const scoreThreshold = tracker.minScore || 0;
        const pointsData = keypoints.map(keypoint => [keypoint.x, -keypoint.y, -keypoint.z]);
        const dataset = new ScatterGL.Dataset([...pointsData, ...tracker.anchors3D]);
        const keypointInd = poseDetection.util.getKeypointIndexBySide(tracker.detectorModel);

        // defined colors for sizes
        tracker.scatterGL.setPointColorer(i => {
            if (keypoints[i] == null || keypoints[i].score < scoreThreshold) {
                return '#ffffff'; // white if low score
            }
            if (i === 0) {
                return '#ff0000'; // red
            }
            if (keypointInd.left.indexOf(i) > -1) {
                return '#00ff00'; // green
            }
            if (keypointInd.right.indexOf(i) > -1) {
                return '#ffa500'; // orange
            }
        });

        // check if already rendered
        if (!tracker.scatterGLInitialized) {
            tracker.scatterGL.render(dataset);
        } else {
            tracker.scatterGL.updateDataset(dataset);
        }

        const connections = poseDetection.util.getAdjacentPairs(tracker.detectorModel);
        const sequences = connections.map(pair => ({
            indices: pair
        }));
        tracker.scatterGL.setSequences(sequences);
        tracker.scatterGLInitialized = true;
    },

    /*
        Clear canvas1 area
     */
    clearcanvas1: function() {
        tracker.ctx.save();
        tracker.ctx.setTransform(1, 0, 0, 1, 0, 0);
        tracker.ctx.clearRect(0, 0, tracker.canvas1.width, tracker.canvas1.height);
        tracker.ctx.restore();
    },

    /*
        Display play/pause icon
     */
    showPlaybackControls: function() {
        let size = (tracker.canvas1.height / 2) * 0.5;

        tracker.ctx.fillStyle = "black";
        tracker.ctx.globalAlpha = 0.5;
        tracker.ctx.fillRect(0, 0, tracker.canvas1.width, tracker.canvas1.height);
        tracker.ctx.fillStyle = "#DDD";
        tracker.ctx.globalAlpha = 0.75;
        tracker.ctx.beginPath();
        tracker.ctx.moveTo(tracker.canvas1.width / 2 + size / 2, tracker.canvas1.height / 2);
        tracker.ctx.lineTo(tracker.canvas1.width / 2 - size / 2, tracker.canvas1.height / 2 + size);
        tracker.ctx.lineTo(tracker.canvas1.width / 2 - size / 2, tracker.canvas1.height / 2 - size);
        tracker.ctx.closePath();
        tracker.ctx.fill();
        tracker.ctx.globalAlpha = 1;
    },

    /*
        Handle play/pause click on video1
     */
    playPauseClick: function() {
        if (tracker.container !== undefined && tracker.container.ready) {
            if (tracker.container.video1.paused) {
                tracker.log('click: Play');
                tracker.play();
                tracker.isWaiting = true;
                tracker.setStatus('Please wait...');
            } else {
                // abort if waiting for playing
                if (!tracker.isWaiting) {
                    tracker.log('click: Pause');
                    tracker.pause();
                    tracker.setStatus('Paused.');
                }
            }
        }
    },

    /*
        Play video1
     */
    play: function() {
        tracker.container.video1.play();
    },

    /*
        Pause video1
     */
    pause: function() {
        tracker.container.video1.pause();
    },

    /*
        Log message
     */
    log: function(...args) {
        if (tracker.log) {
            console.log(...args);
        }
    },

    /*
        Set status message
     */
    setStatus: function(msg) {
        tracker.status = msg;
        tracker.dispatch('statuschange', tracker.status);
    },

    /*
        Append external hook/event
     */
    on: function(name, hook) {
        if (typeof tracker.hooks[name] === 'undefined') {
            return;
        }
        tracker.hooks[name].push(hook);
    },

    /*
        Dispatch hook/event
     */
    dispatch: function(name, event) {
        if (typeof tracker.hooks[name] === 'undefined') {
            return;
        }
        for (const hook of tracker.hooks[name]) {
            hook(event);
        }
    },

    /*
        Pre-initialize model by name
     */
    setModel: function(model) {
        switch (model) {
            case 'BlazePoseLite':
                tracker.detectorModel = poseDetection.SupportedModels.BlazePose;
                tracker.detectorConfig = {
                    runtime: 'tfjs',
                    enableSmoothing: true,
                    modelType: 'lite'
                };
                tracker.minScore = 0.65;
                break;

            case 'BlazePoseHeavy':
                tracker.detectorModel = poseDetection.SupportedModels.BlazePose;
                tracker.detectorConfig = {
                    runtime: 'tfjs',
                    enableSmoothing: true,
                    modelType: 'heavy'
                };
                tracker.minScore = 0.65;
                break;

            case 'BlazePoseFull':
                tracker.detectorModel = poseDetection.SupportedModels.BlazePose;
                tracker.detectorConfig = {
                    runtime: 'tfjs',
                    enableSmoothing: true,
                    modelType: 'full'
                };
                tracker.minScore = 0.65;
                break;

            case 'MoveNetSinglePoseLightning':
                tracker.detectorModel = poseDetection.SupportedModels.MoveNet;
                tracker.detectorConfig = {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                    enableSmoothing: true,
                    multiPoseMaxDimension: 256,
                    enableTracking: true,
                    trackerType: poseDetection.TrackerType.BoundingBox
                }
                tracker.minScore = 0.35;
                break;

            case 'MoveNetMultiPoseLightning':
                tracker.detectorModel = poseDetection.SupportedModels.MoveNet;
                tracker.detectorConfig = {
                    modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
                    enableSmoothing: true,
                    multiPoseMaxDimension: 256,
                    enableTracking: true,
                    trackerType: poseDetection.TrackerType.BoundingBox
                }
                tracker.minScore = 0.35;
                break;

            case 'MoveNetSinglePoseThunder':
                tracker.detectorModel = poseDetection.SupportedModels.MoveNet;
                tracker.detectorConfig = {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
                    enableSmoothing: true,
                    multiPoseMaxDimension: 256,
                    enableTracking: true,
                    trackerType: poseDetection.TrackerType.BoundingBox
                }
                tracker.minScore = 0.35;
                break;

            case 'PoseNetMobileNetV1':
                tracker.detectorModel = poseDetection.SupportedModels.PoseNet;
                tracker.detectorConfig = {
                    architecture: 'MobileNetV1',
                    outputStride: 16,
                    inputResolution: {
                        width: 640,
                        height: 480
                    },
                    multiplier: 0.75
                }
                tracker.minScore = 0.5;
                break;

            case 'PoseNetResNet50':
                tracker.detectorModel = poseDetection.SupportedModels.PoseNet;
                tracker.detectorConfig = {
                    architecture: 'ResNet50',
                    outputStride: 16,
                    multiplier: 1.0,
                    inputResolution: {
                        width: 257,
                        height: 200
                    },
                    quantBytes: 2
                }
                tracker.minScore = 0.5;
                break;
        }
    },
}
