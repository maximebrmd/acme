# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FollowUpRule < Internal::Types::Model
      field :approval, -> { Peal::Types::FollowUpApprovalState }, optional: false, nullable: false

      field :approved_at, -> { String }, optional: false, nullable: true, api_name: "approvedAt"

      field :approved_by, -> { String }, optional: false, nullable: true, api_name: "approvedBy"

      field :channels, -> { Internal::Types::Array[Peal::Types::ChannelFollowUps] }, optional: false, nullable: false

      field :channel_id, -> { String }, optional: false, nullable: true, api_name: "channelId"

      field :comment, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :ended_reason, -> { Peal::Types::FollowUpEndReason }, optional: false, nullable: true, api_name: "endedReason"

      field :follow_ups, -> { Internal::Types::Array[Peal::Types::FollowUp] }, optional: false, nullable: false, api_name: "followUps"

      field :id, -> { String }, optional: false, nullable: false

      field :likes, -> { Integer }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: true, api_name: "postId"

      field :repost, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :started_by, -> { String }, optional: false, nullable: true, api_name: "startedBy"

      field :started_via, -> { Peal::Types::PostOrigin }, optional: false, nullable: false, api_name: "startedVia"

      field :status, -> { Peal::Types::FollowUpRuleStatus }, optional: false, nullable: false
    end
  end
end
