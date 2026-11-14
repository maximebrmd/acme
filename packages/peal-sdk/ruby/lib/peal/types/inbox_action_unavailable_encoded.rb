# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxActionUnavailableEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::InboxActionUnavailableEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :ability, -> { String }, optional: false, nullable: false

      field :standing, -> { Peal::Types::InboxActionUnavailableEncodedStanding }, optional: false, nullable: false
    end
  end
end
