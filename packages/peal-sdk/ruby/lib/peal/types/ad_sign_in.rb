# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdSignIn < Internal::Types::Model
      field :authorization_url, -> { String }, optional: false, nullable: false, api_name: "authorizationUrl"
    end
  end
end
