# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FollowUpNotPossibleEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::FollowUpNotPossibleEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :channels, -> { Internal::Types::Array[Peal::Types::ChannelFollowUps] }, optional: false, nullable: false

      field :reason, -> { Peal::Types::FollowUpRefusal }, optional: false, nullable: false
    end
  end
end
