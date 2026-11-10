# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlatformCapabilities < Internal::Types::Model
      field :analytics, -> { Peal::Types::PlatformCapabilitiesAnalytics }, optional: false, nullable: false

      field :lookups, -> { Internal::Types::Array[Peal::Types::LookupDescription] }, optional: false, nullable: false

      field :media, -> { Peal::Types::MediaCapabilities }, optional: false, nullable: false

      field :options, -> { Peal::Types::PlatformCapabilitiesOptions }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :text, -> { Peal::Types::TextCapabilities }, optional: false, nullable: false

      field :version, -> { Integer }, optional: false, nullable: false
    end
  end
end
