# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostTarget < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :dropped, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :edited_at, -> { String }, optional: false, nullable: true, api_name: "editedAt"

      field :failure_reason, -> { Peal::Types::FailureReason }, optional: false, nullable: true, api_name: "failureReason"

      field :id, -> { String }, optional: false, nullable: false

      field :kept_private, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "keptPrivate"

      field :options, -> { Peal::Types::TargetOptions }, optional: false, nullable: true

      field :parts, -> { Peal::Types::TargetParts }, optional: false, nullable: false

      field :permalink, -> { String }, optional: false, nullable: true

      field :published_at, -> { String }, optional: false, nullable: true, api_name: "publishedAt"

      field :removed_at, -> { String }, optional: false, nullable: true, api_name: "removedAt"

      field :round, -> { Integer }, optional: false, nullable: false

      field :status, -> { Peal::Types::PostTargetStatus }, optional: false, nullable: false

      field :thumbnail_not_set, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "thumbnailNotSet"

      field :unconfirmed_reason, -> { Peal::Types::UnconfirmedReason }, optional: false, nullable: true, api_name: "unconfirmedReason"
    end
  end
end
