/**
 * Type definitions for content analytics (feature not yet implemented)
 */
export interface ShapeCoverage {
 simpleCore: number;
 analogicalModel: number;
 highStakesExample: number;
 patternRecognition: number;
 eliminationLogic: number;
 percentage: number;
}
export interface MnemonicCoverage {
 story: number;
 anchor: number;
 imageUrl: number;
 percentage: number;
}
export interface TierDistribution {
 trunk: number;
 branch: number;
 leaf: number;
 total: number;
}
export interface TreePacket {
 name: string;
 value: number;
 color: string;
 [key: string]: unknown;
}
