# frozen_string_literal: true

module Peal
  module Analytics
    module Types
      class BestTimesAnalyticsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :days, -> { String }, optional: true, nullable: false

        field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
      end
    end
  end
end
