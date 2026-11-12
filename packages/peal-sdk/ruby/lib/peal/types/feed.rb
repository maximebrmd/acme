# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Feed < Internal::Types::Model
      field :attach_picture, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "attachPicture"

      field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

      field :channel_set_id, -> { String }, optional: false, nullable: true, api_name: "channelSetId"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :failing_since, -> { String }, optional: false, nullable: true, api_name: "failingSince"

      field :id, -> { String }, optional: false, nullable: false

      field :last_checked_at, -> { String }, optional: false, nullable: true, api_name: "lastCheckedAt"

      field :last_failure, -> { Peal::Types::FeedFailure }, optional: false, nullable: true, api_name: "lastFailure"

      field :mode, -> { Peal::Types::FeedMode }, optional: false, nullable: false

      field :next_check_at, -> { String }, optional: false, nullable: false, api_name: "nextCheckAt"

      field :queue_id, -> { String }, optional: false, nullable: true, api_name: "queueId"

      field :since, -> { String }, optional: false, nullable: false

      field :started_by, -> { String }, optional: false, nullable: true, api_name: "startedBy"

      field :started_via, -> { Peal::Types::PostOrigin }, optional: false, nullable: false, api_name: "startedVia"

      field :status, -> { Peal::Types::FeedStatus }, optional: false, nullable: false

      field :status_at, -> { String }, optional: false, nullable: true, api_name: "statusAt"

      field :stop_reason, -> { Peal::Types::FeedStoppedReason }, optional: false, nullable: true, api_name: "stopReason"

      field :template, -> { String }, optional: false, nullable: false

      field :title, -> { String }, optional: false, nullable: true

      field :updated_at, -> { String }, optional: false, nullable: false, api_name: "updatedAt"

      field :url, -> { String }, optional: false, nullable: false
    end
  end
end
