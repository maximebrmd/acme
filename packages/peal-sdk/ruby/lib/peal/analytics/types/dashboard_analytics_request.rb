# frozen_string_literal: true

module Peal
  module Analytics
    module Types
      class DashboardAnalyticsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :days, -> { String }, optional: true, nullable: false

        field :from, -> { String }, optional: true, nullable: false

        field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

        field :to, -> { String }, optional: true, nullable: false

        field :top_posts, -> { String }, optional: true, nullable: false, api_name: "topPosts"
      end
    end
  end
end
