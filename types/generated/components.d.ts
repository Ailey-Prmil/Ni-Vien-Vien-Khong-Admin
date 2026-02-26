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
      'place.monastery': PlaceMonastery;
      'response.blog-response': ResponseBlogResponse;
      'response.video-response': ResponseVideoResponse;
    }
  }
}
