# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventFollowUpsNotSent < Internal::Types::Model
      field :count, -> { Integer }, optional: false, nullable: false

      field :reasons, -> { Internal::Types::Array[Peal::Types::FollowUpNotSentReason] }, optional: false, nullable: false

      field :rule_id, -> { String }, optional: false, nullable: false, api_name: "ruleId"
    end
  end
end
