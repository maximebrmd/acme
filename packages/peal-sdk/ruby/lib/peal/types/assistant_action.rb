# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantAction < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::AssistantActionRewrite }, key: "REWRITE"

      member -> { Peal::Types::AssistantActionShorten }, key: "SHORTEN"

      member -> { Peal::Types::AssistantActionTranslate }, key: "TRANSLATE"

      member -> { Peal::Types::AssistantActionHashtags }, key: "HASHTAGS"

      member -> { Peal::Types::AssistantActionWrite }, key: "WRITE"
    end
  end
end
