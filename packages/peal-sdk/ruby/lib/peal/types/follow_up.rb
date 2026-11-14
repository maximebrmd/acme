# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FollowUp < Internal::Types::Model
      field :armed_at, -> { String }, optional: false, nullable: false, api_name: "armedAt"

      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :id, -> { String }, optional: false, nullable: false

      field :kind, -> { Peal::Types::FollowUpKind }, optional: false, nullable: false

      field :likes, -> { Integer }, optional: false, nullable: true

      field :not_before, -> { String }, optional: false, nullable: true, api_name: "notBefore"

      field :permalink, -> { String }, optional: false, nullable: true

      field :platform_post_id, -> { String }, optional: false, nullable: true, api_name: "platformPostId"

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :reason, -> { String }, optional: false, nullable: true

      field :sent_at, -> { String }, optional: false, nullable: true, api_name: "sentAt"

      field :status, -> { Peal::Types::FollowUpStatus }, optional: false, nullable: false

      field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"

      field :triggered_at, -> { String }, optional: false, nullable: true, api_name: "triggeredAt"

      field :until_, -> { String }, optional: false, nullable: true, api_name: "until"
    end
  end
end
