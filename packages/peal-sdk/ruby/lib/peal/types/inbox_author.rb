# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxAuthor < Internal::Types::Model
      field :display_name, -> { String }, optional: false, nullable: true, api_name: "displayName"

      field :handle, -> { String }, optional: false, nullable: false

      field :platform_id, -> { String }, optional: false, nullable: false, api_name: "platformId"
    end
  end
end
