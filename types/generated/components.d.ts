import type { Schema, Struct } from '@strapi/strapi';

export interface ActivityTimetableActivity extends Struct.ComponentSchema {
  collectionName: 'components_activity_timetable_activities';
  info: {
    displayName: 'Timetable Item';
    icon: 'clock';
  };
  attributes: {
    endTime: Schema.Attribute.Time;
    itemName: Schema.Attribute.String & Schema.Attribute.Required;
    itemNote: Schema.Attribute.Text;
    startTime: Schema.Attribute.Time & Schema.Attribute.Required;
  };
}

export interface CourseDetailCourse extends Struct.ComponentSchema {
  collectionName: 'components_course_detail_courses';
  info: {
    displayName: 'Course';
    icon: 'book';
  };
  attributes: {
    courseCategory: Schema.Attribute.Enumeration<
      [
        'Kh\u00F3a Tu M\u00F9a H\u00E8',
        'Kh\u00F3a Tu Xu\u1EA5t Gia Gieo Duy\u00EAn',
        'Kh\u00F3a Thi\u1EC1n',
        'Kh\u00E1c',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Kh\u00E1c'>;
    highlightedImages: Schema.Attribute.Media<'images', true>;
    podcastSection: Schema.Attribute.Component<
      'course-detail.course-podcast',
      true
    >;
    videoSection: Schema.Attribute.Component<
      'course-detail.course-video',
      true
    >;
  };
}

export interface CourseDetailCoursePodcast extends Struct.ComponentSchema {
  collectionName: 'components_course_detail_course_podcasts';
  info: {
    displayName: 'Course Podcast';
  };
  attributes: {
    day: Schema.Attribute.Integer & Schema.Attribute.Required;
    haveOrdinalDate: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    podcastAsset: Schema.Attribute.Media<'files' | 'audios' | 'videos'> &
      Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface CourseDetailCourseVideo extends Struct.ComponentSchema {
  collectionName: 'components_course_detail_course_videos';
  info: {
    displayName: 'Course Video';
    icon: 'cast';
  };
  attributes: {
    day: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<1>;
    haveOrdinalDate: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.String;
    videoLink: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface FormComponentFormComponent extends Struct.ComponentSchema {
  collectionName: 'components_form_component_form_components';
  info: {
    displayName: 'Form Component';
    icon: 'connector';
  };
  attributes: {
    label: Schema.Attribute.String;
    multipleChoiceDetails: Schema.Attribute.Component<
      'form-component.multiple-choice',
      false
    >;
    section: Schema.Attribute.Enumeration<
      [
        'Th\u00F4ng tin CCCD (Identity Detail)',
        'Th\u00F4ng tin tu h\u1ECDc (Monatic Detail)',
        'Th\u00F4ng tin th\u00E2n nh\u00E2n (Relation Detail)',
        'Th\u00F4ng tin sinh ho\u1EA1t (Routine Detail)',
        'Th\u00F4ng tin kh\u00E1c (Others)',
      ]
    >;
    type: Schema.Attribute.Enumeration<
      [
        'short text',
        'long text',
        'bool',
        'date',
        'datetime',
        'number',
        'multiple choice',
      ]
    >;
  };
}

export interface FormComponentFormTemplate extends Struct.ComponentSchema {
  collectionName: 'components_form_component_form_templates';
  info: {
    displayName: 'Form Template';
  };
  attributes: {
    commitmentMessages: Schema.Attribute.Component<
      'form-component.text-input',
      true
    >;
    customizedComponents: Schema.Attribute.Component<
      'form-component.form-component',
      true
    >;
    defaultIdentitySectionIncluded: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    defaultMonasticSectionIncluded: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    defaultRelationSectionIncluded: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    defaultRoutineSectionIncluded: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    registrationDescription: Schema.Attribute.Blocks;
  };
}

export interface FormComponentMultipleChoice extends Struct.ComponentSchema {
  collectionName: 'components_form_component_multiple_choices';
  info: {
    displayName: 'Multiple Choice';
  };
  attributes: {
    haveOtherValue: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    multipleSelection: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    options: Schema.Attribute.Component<'form-component.text-input', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
  };
}

export interface FormComponentTextInput extends Struct.ComponentSchema {
  collectionName: 'components_form_component_text_inputs';
  info: {
    displayName: 'Text Input';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface FormSectionBasicInformation extends Struct.ComponentSchema {
  collectionName: 'components_form_section_basic_informations';
  info: {
    displayName: 'Basic Information';
  };
  attributes: {
    address: Schema.Attribute.Text & Schema.Attribute.Required;
    dob: Schema.Attribute.Date & Schema.Attribute.Required;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    fullName: Schema.Attribute.String & Schema.Attribute.Required;
    gender: Schema.Attribute.Enumeration<['Male', 'Female']> &
      Schema.Attribute.Required;
    haveZalo: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    phoneNumber: Schema.Attribute.String & Schema.Attribute.Required;
    zaloName: Schema.Attribute.String;
  };
}

export interface FormSectionIdentityDetail extends Struct.ComponentSchema {
  collectionName: 'components_form_section_identity_details';
  info: {
    displayName: 'Identity Detail';
    icon: 'briefcase';
  };
  attributes: {
    IDNumber: Schema.Attribute.String & Schema.Attribute.Required;
    issueAt: Schema.Attribute.Enumeration<
      [
        'B\u1ED9 C\u00F4ng An',
        'C\u1EE5c C\u1EA3nh s\u00E1t qu\u1EA3n l\u00FD h\u00E0nh ch\u00EDnh v\u1EC1 tr\u1EADt t\u1EF1 x\u00E3 h\u1ED9i',
        'C\u1EE5c C\u1EA3nh s\u00E1t \u0111\u0103ng k\u00FD qu\u1EA3n l\u00FD c\u01B0 tr\u00FA v\u00E0 d\u1EEF li\u1EC7u Qu\u1ED1c gia v\u1EC1 d\u00E2n c\u01B0',
        'Kh\u00E1c',
      ]
    > &
      Schema.Attribute.Required;
    issueDate: Schema.Attribute.Date & Schema.Attribute.Required;
    otherIssueOrganisation: Schema.Attribute.String;
  };
}

export interface FormSectionMonasticDetail extends Struct.ComponentSchema {
  collectionName: 'components_form_section_monastic_details';
  info: {
    displayName: 'Monastic Detail';
  };
  attributes: {
    currentMonastery: Schema.Attribute.String;
    dharmaName: Schema.Attribute.String & Schema.Attribute.Required;
    monasticRank: Schema.Attribute.Enumeration<
      [
        'T\u1EF3 Kheo Ni',
        'Sadini',
        'Tu n\u1EEF',
        'C\u01B0 s\u0129 nam',
        'C\u01B0 s\u0129 n\u1EEF',
      ]
    >;
    monasticTradition: Schema.Attribute.Enumeration<
      ['Nam T\u00F4ng', 'B\u1EAFc T\u00F4ng', 'Kh\u1EA5t S\u0129', 'Kh\u00E1c']
    >;
    otherMonasticTradition: Schema.Attribute.String;
    yearsOfPractice: Schema.Attribute.Integer;
  };
}

export interface FormSectionRelationDetail extends Struct.ComponentSchema {
  collectionName: 'components_form_section_relation_details';
  info: {
    displayName: 'Relation Detail';
  };
  attributes: {
    fullName: Schema.Attribute.String & Schema.Attribute.Required;
    phoneNumber: Schema.Attribute.String & Schema.Attribute.Required;
    relationship: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface FormSectionRoutineDetail extends Struct.ComponentSchema {
  collectionName: 'components_form_section_routine_details';
  info: {
    displayName: 'Routine Detail';
  };
  attributes: {
    dietaryRequirements: Schema.Attribute.Enumeration<
      ['\u0102n chay (Vegan)', '\u0102n th\u01B0\u1EDDng (Regular)']
    >;
    foodAllergies: Schema.Attribute.Text;
    medicalCondition: Schema.Attribute.String;
  };
}

export interface PlaceMonastery extends Struct.ComponentSchema {
  collectionName: 'components_place_monasteries';
  info: {
    displayName: 'Monastery';
    icon: 'pinMap';
  };
  attributes: {
    closingHour: Schema.Attribute.Time;
    coverImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    monasteryAddress: Schema.Attribute.String & Schema.Attribute.Required;
    monasteryDescription: Schema.Attribute.String;
    monasteryName: Schema.Attribute.String & Schema.Attribute.Required;
    openingHour: Schema.Attribute.Time;
  };
}

export interface ResponseBlogResponse extends Struct.ComponentSchema {
  collectionName: 'components_response_blog_responses';
  info: {
    displayName: 'Blog Response';
  };
  attributes: {
    responseContent: Schema.Attribute.Blocks & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface ResponseVideoResponse extends Struct.ComponentSchema {
  collectionName: 'components_response_video_responses';
  info: {
    displayName: 'Video Response';
  };
  attributes: {
    title: Schema.Attribute.String;
    videoLink: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'activity.timetable-activity': ActivityTimetableActivity;
      'course-detail.course': CourseDetailCourse;
      'course-detail.course-podcast': CourseDetailCoursePodcast;
      'course-detail.course-video': CourseDetailCourseVideo;
      'form-component.form-component': FormComponentFormComponent;
      'form-component.form-template': FormComponentFormTemplate;
      'form-component.multiple-choice': FormComponentMultipleChoice;
      'form-component.text-input': FormComponentTextInput;
      'form-section.basic-information': FormSectionBasicInformation;
      'form-section.identity-detail': FormSectionIdentityDetail;
      'form-section.monastic-detail': FormSectionMonasticDetail;
      'form-section.relation-detail': FormSectionRelationDetail;
      'form-section.routine-detail': FormSectionRoutineDetail;
      'place.monastery': PlaceMonastery;
      'response.blog-response': ResponseBlogResponse;
      'response.video-response': ResponseVideoResponse;
    }
  }
}
