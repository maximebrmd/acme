# frozen_string_literal: true

module Peal
  module Analytics
    module Types
      class ChannelAnalyticsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :days, -> { String }, optional: true, nullable: false

        field :from, -> { String }, optional: true, nullable: false

        field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

        field :to, -> { String }, optional: true, nullable: false
      end
    end
  end
end
